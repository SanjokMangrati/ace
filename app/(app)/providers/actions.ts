"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import {
  type ProviderKeyFormInput,
  providerKeyFormSchema,
} from "@/lib/provider-key-schemas"
import {
  deleteProviderKey,
  insertProviderKey,
} from "@/server/db/queries/provider-keys"
import { sealProviderKey } from "@/server/seal-provider-key"
import { requireUser } from "@/server/session"

export type ProviderActionResult =
  | { ok: true }
  | { ok: false; field?: keyof ProviderKeyFormInput; message: string }

export async function addProviderKey(
  values: ProviderKeyFormInput
): Promise<ProviderActionResult> {
  const user = await requireUser()
  const parsed = providerKeyFormSchema.safeParse(values)
  if (!parsed.success) {
    const issue = parsed.error.issues[0]
    const field = issue?.path[0]
    return {
      ok: false,
      field:
        typeof field === "string" && field in values
          ? (field as keyof ProviderKeyFormInput)
          : undefined,
      message: issue?.message ?? "Check the form and try again.",
    }
  }
  const sealed = sealProviderKey(parsed.data)
  if (!sealed.ok) {
    return { ok: false, field: "provider", message: sealed.message }
  }

  await insertProviderKey({ ...sealed.key, userId: user.id })

  revalidatePath("/", "layout")
  return { ok: true }
}

export async function removeProviderKey(
  keyId: string
): Promise<ProviderActionResult> {
  const user = await requireUser()
  const id = z.uuid().safeParse(keyId)
  if (!id.success || !(await deleteProviderKey(user.id, id.data))) {
    return {
      ok: false,
      message: "We couldn't find this key. It may already be removed.",
    }
  }

  revalidatePath("/", "layout")
  return { ok: true }
}
