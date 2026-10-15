"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import type { FieldPath } from "react-hook-form"
import {
  botIdSchema,
  NEW_KEY,
  type TeammateFormInput,
  teammateFormSchema,
} from "@/lib/bot-schemas"
import { catalogModel, PROVIDER_INFO, type Provider } from "@/lib/models"
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

type TeammateField = FieldPath<TeammateFormInput> | "picture"

export type TeammateActionResult =
  | { ok: true }
  | { ok: false; field?: TeammateField; message: string }

type Parsed =
  | {
      ok: true
      input: BotInput
      key: BotKey
      picture: BotPicture | null | undefined
    }
  | { ok: false; result: TeammateActionResult }

const invalid = (
  message: string,
  field?: TeammateField
): { ok: false; result: TeammateActionResult } => ({
  ok: false,
  result: { ok: false, field, message },
})

function issueField(path: PropertyKey[]): TeammateField | undefined {
  const [first] = path
  if (typeof first !== "string" || !(first in teammateFormSchema.shape)) {
    return undefined
  }
  return path.map(String).join(".") as TeammateField
}

async function resolveKey(
  userId: string,
  input: TeammateFormInput
): Promise<
  { ok: true; key: BotKey; provider: Provider } | { ok: false; result: Parsed }
> {
  if (input.providerKeyId === NEW_KEY) {
    const sealed = sealProviderKey(input.newKey)
    if (!sealed.ok) {
      return { ok: false, result: invalid(sealed.message, "newKey.provider") }
    }
    return {
      ok: true,
      key: { create: sealed.key },
      provider: sealed.key.provider,
    }
  }
  const key = await findProviderKey(userId, input.providerKeyId)
  if (!key) {
    return {
      ok: false,
      result: invalid("Pick one of your AI providers.", "providerKeyId"),
    }
  }
  return { ok: true, key: { id: key.id }, provider: key.provider }
}

async function parseForm(userId: string, formData: FormData): Promise<Parsed> {
  let raw: unknown
  try {
    raw = JSON.parse(String(formData.get("data")))
  } catch {
    return invalid("Something went wrong. Reload the page and try again.")
  }
  const parsed = teammateFormSchema.safeParse(raw)
  if (!parsed.success) {
    const issue = parsed.error.issues[0]
    return invalid(
      issue?.message ?? "Check the form and try again.",
      issue ? issueField(issue.path) : undefined
    )
  }
  const {
    providerKeyId: _providerKeyId,
    newKey: _newKey,
    ...input
  } = parsed.data

  const key = await resolveKey(userId, parsed.data)
  if (!key.ok) return key.result
  if (
    PROVIDER_INFO[key.provider].models.length > 0 &&
    !catalogModel(key.provider, input.modelId)
  ) {
    return invalid("Pick a model from the list.", "modelId")
  }

  let picture: BotPicture | null | undefined
  const file = formData.get("picture")
  if (file instanceof File && file.size > 0) {
    const result = readPicture(Buffer.from(await file.arrayBuffer()))
    if (!result.ok) return invalid(result.message, "picture")
    picture = { data: result.data, type: result.type }
  } else if (formData.get("removePicture") === "true") {
    picture = null
  }

  return { ok: true, input, key: key.key, picture }
}

export async function createTeammate(
  formData: FormData
): Promise<TeammateActionResult> {
  const user = await requireUser()
  const id = botIdSchema.safeParse(formData.get("id"))
  if (!id.success) {
    return {
      ok: false,
      message: "Something went wrong. Reload the page and try again.",
    }
  }
  const form = await parseForm(user.id, formData)
  if (!form.ok) return form.result

  try {
    await insertBot(
      user.id,
      id.data,
      form.input,
      form.key,
      form.picture ?? null
    )
  } catch {
    return {
      ok: false,
      message:
        "We couldn't create this teammate. Reload the page and try again.",
    }
  }

  revalidatePath("/", "layout")
  redirect("/teammates")
}

export async function updateTeammate(
  formData: FormData
): Promise<TeammateActionResult> {
  const user = await requireUser()
  const id = botIdSchema.safeParse(formData.get("id"))
  if (!id.success) {
    return { ok: false, message: "We couldn't find this teammate." }
  }
  const form = await parseForm(user.id, formData)
  if (!form.ok) return form.result

  const updated = await updateBot(
    user.id,
    id.data,
    form.input,
    form.key,
    form.picture
  )
  if (!updated) {
    return {
      ok: false,
      message: "We couldn't find this teammate. It may have been deleted.",
    }
  }

  revalidatePath("/", "layout")
  redirect("/teammates")
}

export async function deleteTeammate(
  botId: string
): Promise<TeammateActionResult> {
  const user = await requireUser()
  const id = botIdSchema.safeParse(botId)
  if (!id.success || !(await deleteBot(user.id, id.data))) {
    return {
      ok: false,
      message: "We couldn't find this teammate. It may already be deleted.",
    }
  }

  revalidatePath("/", "layout")
  redirect("/teammates")
}
