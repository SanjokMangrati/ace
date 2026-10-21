"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { type ActionResult, fail, zodFailure } from "@/lib/action-result"
import type { CatalogModel } from "@/lib/models"
import {
  type ProviderKeyFormInput,
  providerKeyFormSchema,
} from "@/lib/provider-key-schemas"
import { logger, serverModels } from "@/server/container"
import {
  deleteProviderKey,
  insertProviderKey,
} from "@/server/db/queries/provider-keys"
import { env } from "@/server/env"
import { sealProviderKey } from "@/server/seal-provider-key"
import { requireUser } from "@/server/session"

export async function addProviderKey(
  values: ProviderKeyFormInput
): Promise<ActionResult<keyof ProviderKeyFormInput>> {
  const user = await requireUser()
  const parsed = providerKeyFormSchema.safeParse(values)
  if (!parsed.success) return zodFailure(parsed.error)
  const sealed = await sealProviderKey(parsed.data)
  if (!sealed.ok) return sealed

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

export async function listServerModels(
  baseUrl: string,
  apiKey: string
): Promise<CatalogModel[]> {
  await requireUser()
  const url = z.url({ protocol: /^https?$/ }).safeParse(baseUrl.trim())
  if (!env.ALLOW_CUSTOM_BASE_URL || !url.success) return []
  return serverModels
    .list({ baseUrl: url.data, apiKey: apiKey.trim() || undefined })
    .catch((error) => {
      logger.warn("Model list unavailable", { err: error })
      return []
    })
}
