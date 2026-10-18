"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import type { FieldPath } from "react-hook-form"
import {
  type ActionResult,
  type Failure,
  fail,
  RELOAD_AND_TRY_AGAIN,
  zodFailure,
} from "@/lib/action-result"
import {
  botIdSchema,
  NEW_KEY,
  PICK_LISTED_MODEL,
  PICK_SAVED_PROVIDER,
  TEAMMATE_NOT_FOUND,
  type TeammateFormInput,
  teammateFormSchema,
} from "@/lib/bot-schemas"
import type { Provider } from "@/lib/models"
import { blobs, chatRuntime, sandboxes } from "@/server/container"
import {
  type BotInput,
  type BotKey,
  countBots,
  deleteBot,
  insertBot,
  updateBot,
} from "@/server/db/queries/bots"
import { listBotChatIds } from "@/server/db/queries/chats"
import { findProviderKey } from "@/server/db/queries/provider-keys"
import { findBotSandboxRef } from "@/server/db/queries/sandboxes"
import { env, teammateCaps } from "@/server/env"
import { readPicture } from "@/server/picture"
import type { StoredBlob } from "@/server/ports/blob-store"
import { isListedModel } from "@/server/provider-key-models"
import { sealProviderKey } from "@/server/seal-provider-key"
import { requireUser } from "@/server/session"

type TeammateField = FieldPath<TeammateFormInput> | "picture"
type TeammateFailure = Failure<TeammateField>

async function resolveKey(
  userId: string,
  input: TeammateFormInput
): Promise<{ ok: true; key: BotKey; provider: Provider } | TeammateFailure> {
  if (input.providerKeyId === NEW_KEY) {
    const sealed = await sealProviderKey(input.newKey)
    if (!sealed.ok)
      return fail(sealed.message, `newKey.${sealed.field ?? "provider"}`)
    return {
      ok: true,
      key: { create: sealed.key },
      provider: sealed.key.provider,
    }
  }
  const key = await findProviderKey(userId, input.providerKeyId)
  if (!key) return fail(PICK_SAVED_PROVIDER, "providerKeyId")
  return { ok: true, key: { id: key.id }, provider: key.provider }
}

async function parseForm(
  userId: string,
  formData: FormData
): Promise<
  | {
      ok: true
      input: BotInput
      key: BotKey
      picture: StoredBlob | null | undefined
    }
  | TeammateFailure
> {
  let raw: unknown
  try {
    raw = JSON.parse(String(formData.get("data")))
  } catch {
    return fail(RELOAD_AND_TRY_AGAIN)
  }
  const parsed = teammateFormSchema(teammateCaps).safeParse(raw)
  if (!parsed.success) return zodFailure(parsed.error)
  const {
    providerKeyId: _providerKeyId,
    newKey: _newKey,
    ...input
  } = parsed.data

  const key = await resolveKey(userId, parsed.data)
  if (!key.ok) return key
  if (!(await isListedModel(key.provider, input.modelId))) {
    return fail(PICK_LISTED_MODEL, "modelId")
  }

  let picture: StoredBlob | null | undefined
  const file = formData.get("picture")
  if (file instanceof File && file.size > 0) {
    const result = readPicture(Buffer.from(await file.arrayBuffer()))
    if (!result.ok) return fail(result.message, "picture")
    picture = { data: result.data, type: result.type }
  } else if (formData.get("removePicture") === "true") {
    picture = null
  }

  return { ok: true, input, key: key.key, picture }
}

export async function createTeammate(
  formData: FormData
): Promise<ActionResult<TeammateField>> {
  const user = await requireUser()
  const id = botIdSchema.safeParse(formData.get("id"))
  if (!id.success) return fail(RELOAD_AND_TRY_AGAIN)
  const most = env.MAX_TEAMMATES
  if (most !== undefined && (await countBots(user.id)) >= most) {
    return fail(
      `You already have ${most === 1 ? "a teammate" : `${most} teammates`}, the most you can have here. Delete one to make room for a new one.`
    )
  }
  const form = await parseForm(user.id, formData)
  if (!form.ok) return form

  await insertBot(
    blobs,
    user.id,
    id.data,
    form.input,
    form.key,
    form.picture ?? null
  )

  revalidatePath("/", "layout")
  return { ok: true }
}

export async function updateTeammate(
  formData: FormData
): Promise<ActionResult<TeammateField>> {
  const user = await requireUser()
  const id = botIdSchema.safeParse(formData.get("id"))
  if (!id.success) return fail(TEAMMATE_NOT_FOUND)
  const form = await parseForm(user.id, formData)
  if (!form.ok) return form

  const updated = await updateBot(
    blobs,
    user.id,
    id.data,
    form.input,
    form.key,
    form.picture
  )
  if (!updated) return fail(TEAMMATE_NOT_FOUND)

  revalidatePath("/", "layout")
  return { ok: true }
}

export async function deleteTeammate(botId: string): Promise<Failure> {
  const user = await requireUser()
  const id = botIdSchema.safeParse(botId)
  if (!id.success) return fail(TEAMMATE_NOT_FOUND)
  const chatIds = await listBotChatIds(user.id, id.data)
  await Promise.all(
    chatIds.map((chatId) =>
      chatRuntime.closeSession(chatId, "teammate deleted")
    )
  )
  const sandboxRef = await findBotSandboxRef(user.id, id.data)
  if (sandboxRef) await sandboxes.destroy(sandboxRef)
  if (!(await deleteBot(blobs, user.id, id.data)))
    return fail(TEAMMATE_NOT_FOUND)

  revalidatePath("/", "layout")
  redirect("/teammates")
}
