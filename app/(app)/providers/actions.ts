"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { type ActionResult, fail, zodFailure } from "@/lib/action-result"
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

export async function addProviderKey(
  values: ProviderKeyFormInput
): Promise<ActionResult<keyof ProviderKeyFormInput>> {
  const user = await requireUser()
  const parsed = providerKeyFormSchema.safeParse(values)
  if (!parsed.success) return zodFailure(parsed.error)
  const sealed = sealProviderKey(parsed.data)
  if (!sealed.ok) return fail(sealed.message, "provider")

  await insertProviderKey({ ...sealed.key, userId: user.id })

  revalidatePath("/", "layout")
  return { ok: true }
}

export async function removeProviderKey(keyId: string): Promise<ActionResult> {
  const user = await requireUser()
  const id = z.uuid().safeParse(keyId)
  if (!id.success || !(await deleteProviderKey(user.id, id.data))) {
    return fail("We couldn't find this key. It may already be removed.")
  }

  revalidatePath("/", "layout")
  return { ok: true }
}
