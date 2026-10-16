"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import {
  type ActionResult,
  type Failure,
  fail,
  RELOAD_AND_TRY_AGAIN,
  zodFailure,
} from "@/lib/action-result"
import { TEAMMATE_NOT_FOUND } from "@/lib/bot-schemas"
import { type ControlEvent, chatTitle } from "@/lib/chat"
import {
  chatIdSchema,
  type NewChatInput,
  newChatSchema,
} from "@/lib/chat-schemas"
import { chatRuntime, sandboxes } from "@/server/container"
import {
  deleteChat as deleteChatRow,
  findChatBotId,
  insertChat,
  ownsChat,
} from "@/server/db/queries/chats"
import {
  findTakeover,
  giveBackControl,
  saveSandbox,
  takeControl,
} from "@/server/db/queries/sandboxes"
import { requireUser } from "@/server/session"

const LIVE_VIEW_TTL_SEC = 30 * 60
const TAKEOVER_TIMEOUT_SEC = 24 * 60 * 60

export async function createChat(
  values: NewChatInput
): Promise<Failure<keyof NewChatInput>> {
  const user = await requireUser()
  const parsed = newChatSchema.safeParse(values)
  if (!parsed.success) return zodFailure(parsed.error)
  const { id, botId, message } = parsed.data

  if (!(await insertChat(user.id, { id, botId, title: chatTitle(message) }))) {
    return fail(TEAMMATE_NOT_FOUND, "botId")
  }

  revalidatePath("/", "layout")
  redirect(`/chats/${id}`)
}

async function requireChat(chatId: string) {
  const user = await requireUser()
  const id = chatIdSchema.parse(chatId)
  if (!(await ownsChat(user.id, id))) throw new Error("Chat not found")
  return id
}

async function requireChatBot(chatId: string) {
  const user = await requireUser()
  const id = chatIdSchema.parse(chatId)
  const botId = await findChatBotId(user.id, id)
  if (!botId) throw new Error("Chat not found")
  return { userId: user.id, chatId: id, botId }
}

export async function startChatSession(chatId: string) {
  return chatRuntime.startSession(await requireChat(chatId))
}

export async function mintChatAccessToken(chatId: string) {
  return chatRuntime.accessToken(await requireChat(chatId))
}

export async function openScreen(
  chatId: string
): Promise<{ ok: true; url: string }> {
  const { botId } = await requireChatBot(chatId)
  const sandbox = await sandboxes.open(botId)
  await saveSandbox({
    botId,
    provider: sandboxes.name,
    providerRef: sandbox.ref,
  })
  const [desktop, takeover] = await Promise.all([
    sandbox.desktop(),
    findTakeover(botId),
  ])
  const url = await desktop.liveView(
    takeover ? "interact" : "view",
    LIVE_VIEW_TTL_SEC
  )
  return { ok: true, url }
}

export async function takeControlOfScreen(
  chatId: string
): Promise<ActionResult> {
  const { userId, botId, chatId: id } = await requireChatBot(chatId)
  const waitRef = await chatRuntime.createWait(TAKEOVER_TIMEOUT_SEC)
  if (!(await takeControl(userId, { botId, chatId: id, waitRef }))) {
    await chatRuntime.completeWait(waitRef)
    return fail(RELOAD_AND_TRY_AGAIN)
  }
  revalidatePath("/", "layout")
  return { ok: true }
}

export async function giveBackControlOfScreen(
  chatId: string
): Promise<{ ok: true; control: ControlEvent | null }> {
  const { userId, botId } = await requireChatBot(chatId)
  const takeover = await giveBackControl(userId, botId)
  if (takeover?.waitRef) await chatRuntime.completeWait(takeover.waitRef)
  revalidatePath("/", "layout")
  return {
    ok: true,
    control: takeover?.since
      ? { tookAt: takeover.since.getTime(), gaveAt: Date.now() }
      : null,
  }
}

export async function deleteChat(
  chatId: string,
  leave: boolean
): Promise<{ ok: true }> {
  const { userId, botId, chatId: id } = await requireChatBot(chatId)
  const takeover = await giveBackControl(userId, botId, id)
  if (takeover?.waitRef) await chatRuntime.completeWait(takeover.waitRef)
  await chatRuntime.closeSession(id, "chat deleted")
  await deleteChatRow(userId, id)
  revalidatePath("/", "layout")
  if (leave) redirect("/")
  return { ok: true }
}
