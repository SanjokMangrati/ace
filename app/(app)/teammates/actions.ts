"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import type { FieldPath } from "react-hook-form"
import {
  type Failure,
  fail,
  RELOAD_AND_TRY_AGAIN,
  zodFailure,
} from "@/lib/action-result"
import {
  botIdSchema,
  NEW_KEY,
  type TeammateFormInput,
  teammateFormSchema,
} from "@/lib/bot-schemas"
import type { Provider } from "@/lib/models"
import { modelCatalog } from "@/server/container"
import {
  type BotInput,
  type BotKey,
  type BotPicture,
  deleteBot,
  insertBot,
  updateBot,
} from "@/server/db/queries/bots"
import { findProviderKey } from "@/server/db/queries/provider-keys"
import { readPicture } from "@/server/picture"
import { sealProviderKey } from "@/server/seal-provider-key"
import { requireUser } from "@/server/session"

type TeammateFailure = Failure<FieldPath<TeammateFormInput> | "picture">

const TEAMMATE_NOT_FOUND =
  "We couldn't find this teammate. It may have been deleted."

async function resolveKey(
  userId: string,
  input: TeammateFormInput
): Promise<{ ok: true; key: BotKey; provider: Provider } | TeammateFailure> {
  if (input.providerKeyId === NEW_KEY) {
    const sealed = sealProviderKey(input.newKey)
    if (!sealed.ok) return fail(sealed.message, "newKey.provider")
    return {
      ok: true,
      key: { create: sealed.key },
      provider: sealed.key.provider,
    }
  }
  const key = await findProviderKey(userId, input.providerKeyId)
  if (!key) return fail("Pick one of your AI providers.", "providerKeyId")
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
      picture: BotPicture | null | undefined
    }
  | TeammateFailure
> {
  let raw: unknown
  try {
    raw = JSON.parse(String(formData.get("data")))
  } catch {
    return fail(RELOAD_AND_TRY_AGAIN)
  }
  const parsed = teammateFormSchema.safeParse(raw)
  if (!parsed.success) return zodFailure(parsed.error)
  const {
    providerKeyId: _providerKeyId,
    newKey: _newKey,
    ...input
  } = parsed.data

  const key = await resolveKey(userId, parsed.data)
  if (!key.ok) return key
  if (
    key.provider !== "openai_compatible" &&
    !(await modelCatalog.find(key.provider, input.modelId))
  ) {
    return fail("Pick a model from the list.", "modelId")
  }

  let picture: BotPicture | null | undefined
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
): Promise<TeammateFailure> {
  const user = await requireUser()
  const id = botIdSchema.safeParse(formData.get("id"))
  if (!id.success) return fail(RELOAD_AND_TRY_AGAIN)
  const form = await parseForm(user.id, formData)
  if (!form.ok) return form

  await insertBot(user.id, id.data, form.input, form.key, form.picture ?? null)

  revalidatePath("/", "layout")
  redirect("/teammates")
}

export async function updateTeammate(
  formData: FormData
): Promise<TeammateFailure> {
  const user = await requireUser()
  const id = botIdSchema.safeParse(formData.get("id"))
  if (!id.success) return fail(TEAMMATE_NOT_FOUND)
  const form = await parseForm(user.id, formData)
  if (!form.ok) return form

  const updated = await updateBot(
    user.id,
    id.data,
    form.input,
    form.key,
    form.picture
  )
  if (!updated) return fail(TEAMMATE_NOT_FOUND)

  revalidatePath("/", "layout")
  redirect("/teammates")
}

export async function deleteTeammate(botId: string): Promise<Failure> {
  const user = await requireUser()
  const id = botIdSchema.safeParse(botId)
  if (!id.success || !(await deleteBot(user.id, id.data))) {
    return fail(TEAMMATE_NOT_FOUND)
  }

  revalidatePath("/", "layout")
  redirect("/teammates")
}
