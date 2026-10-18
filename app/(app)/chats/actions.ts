"use server"

import { refresh, revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import {
  type ActionResult,
  type Failure,
  fail,
  RELOAD_AND_TRY_AGAIN,
  zodFailure,
} from "@/lib/action-result"
import {
  PICK_LISTED_MODEL,
  PICK_SAVED_PROVIDER,
  TEAMMATE_NOT_FOUND,
} from "@/lib/bot-schemas"
import type { ControlEvent } from "@/lib/chat"
import {
  type ChatModelInput,
  chatIdSchema,
  chatModelSchema,
  type NewChatInput,
  newChatSchema,
  type PickedModel,
} from "@/lib/chat-schemas"
import { blobs, chatRuntime, sandboxes } from "@/server/container"
import {
  deleteChat as deleteChatRow,
  findChatBotIds,
  insertChat,
  listChatStatuses,
  setChatModel,
} from "@/server/db/queries/chats"
import { findProviderKey } from "@/server/db/queries/provider-keys"
import {
  giveBackControl,
  saveSandbox,
  takeControl,
} from "@/server/db/queries/sandboxes"
import { isListedModel } from "@/server/provider-key-models"
import { TAKEOVER_TIMEOUT_SEC, wakeBotWaiters } from "@/server/sandbox/lease"
import { requireUser } from "@/server/session"

const LIVE_VIEW_TTL_SEC = 30 * 60

async function modelProblem(userId: string, model: PickedModel) {
  const key = await findProviderKey(userId, model.providerKeyId)
  if (!key) return PICK_SAVED_PROVIDER
  if (!(await isListedModel(key.provider, model.modelId))) {
    return PICK_LISTED_MODEL
  }
}

export async function createChat(
  values: NewChatInput
): Promise<Failure<keyof NewChatInput>> {
  const user = await requireUser()
  const parsed = newChatSchema.safeParse(values)
  if (!parsed.success) return zodFailure(parsed.error)
  const { id, botIds, message } = parsed.data
  const models = Object.fromEntries(
    Object.entries(parsed.data.models).filter(([botId]) =>
      botIds.includes(botId)
    )
  )
  const [problem] = (
    await Promise.all(
      Object.values(models).map((model) => modelProblem(user.id, model))
    )
  ).filter(Boolean)
  if (problem) return fail(problem)

  if (!(await insertChat(user.id, { id, botIds, message, models }))) {
    return fail(TEAMMATE_NOT_FOUND, "botIds")
  }

  revalidatePath("/", "layout")
  redirect(`/chats/${id}`)
}

async function requireChat(chatId: string) {
  const user = await requireUser()
  const id = chatIdSchema.parse(chatId)
  const botIds = await findChatBotIds(user.id, id)
  if (botIds.length === 0) throw new Error("Chat not found")
  return { userId: user.id, chatId: id, botIds }
}

async function requireChatBot(chatId: string, botId: string) {
  const chat = await requireChat(chatId)
  if (!chat.botIds.includes(botId)) throw new Error("Chat not found")
  return chat
}

export async function changeChatModel(
  values: ChatModelInput
): Promise<ActionResult<keyof ChatModelInput>> {
  const parsed = chatModelSchema.safeParse(values)
  if (!parsed.success) return zodFailure(parsed.error)
  const { chatId, botId, ...model } = parsed.data
  const { userId, chatId: id } = await requireChatBot(chatId, botId)
  const problem = await modelProblem(userId, model)
  if (problem) return fail(problem)
  await setChatModel(id, botId, model)
  refresh()
  return { ok: true }
}

export async function chatStatuses(chatIds: string[]) {
  const user = await requireUser()
  return listChatStatuses(user.id, chatIdSchema.array().parse(chatIds))
}

export async function startChatSession(chatId: string) {
  return chatRuntime.startSession((await requireChat(chatId)).chatId)
}

export async function mintChatAccessToken(chatId: string) {
  return chatRuntime.accessToken((await requireChat(chatId)).chatId)
}

export async function openScreen(
  chatId: string,
  botId: string
): Promise<{ ok: true; url: string }> {
  await requireChatBot(chatId, botId)
  const sandbox = await sandboxes.open(botId)
  await saveSandbox({
    botId,
    provider: sandboxes.name,
    providerRef: sandbox.ref,
  })
  const desktop = await sandbox.desktop()
  return { ok: true, url: await desktop.liveView(LIVE_VIEW_TTL_SEC) }
}

export async function takeControlOfScreen(
  chatId: string,
  botId: string
): Promise<ActionResult> {
  const { userId, chatId: id } = await requireChatBot(chatId, botId)
  const waitRef = await chatRuntime.createWait(TAKEOVER_TIMEOUT_SEC)
  if (!(await takeControl(userId, { botId, chatId: id, waitRef }))) {
    await chatRuntime.completeWait(waitRef)
    return fail(RELOAD_AND_TRY_AGAIN)
  }
  revalidatePath("/", "layout")
  return { ok: true }
}

export async function giveBackControlOfScreen(
  chatId: string,
  botId: string
): Promise<{ ok: true; control: Required<ControlEvent> | null }> {
  const { userId } = await requireChatBot(chatId, botId)
  const takeover = await giveBackControl(userId, botId)
  if (takeover?.waitRef) await chatRuntime.completeWait(takeover.waitRef)
  revalidatePath("/", "layout")
  return {
    ok: true,
    control: takeover?.since
      ? { tookAt: takeover.since.getTime(), gaveAt: Date.now(), botId }
      : null,
  }
}

export async function deleteChat(
  chatId: string,
  leave: boolean
): Promise<{ ok: true }> {
  const { userId, botIds, chatId: id } = await requireChat(chatId)
  const takeovers = await Promise.all(
    botIds.map((botId) => giveBackControl(userId, botId, id))
  )
  await Promise.all(
    takeovers.map(
      (takeover) =>
        takeover?.waitRef && chatRuntime.completeWait(takeover.waitRef)
    )
  )
  await chatRuntime.closeSession(id, "chat deleted")
  await deleteChatRow(blobs, userId, id)
  await Promise.all(botIds.map((botId) => wakeBotWaiters(chatRuntime, botId)))
  revalidatePath("/", "layout")
  if (leave) redirect("/")
  return { ok: true }
}
