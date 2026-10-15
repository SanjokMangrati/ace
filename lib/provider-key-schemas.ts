import { createInsertSchema } from "drizzle-zod"
import { z } from "zod"
import { PROVIDER_INFO, type Provider } from "@/lib/models"
import { providerKey } from "@/server/db/schema/bots"

const API_KEY_MIN_LENGTH = 20
const API_KEY_MAX_LENGTH = 500

const httpUrlSchema = z.url({ protocol: /^https?$/ })

export const providerKeyFieldsSchema = createInsertSchema(providerKey, {
  baseUrl: (schema) => schema.trim().max(500, "That address is too long."),
  judgeModelId: (schema) =>
    schema.trim().max(200, "That model name is too long."),
})
  .pick({ provider: true, baseUrl: true, judgeModelId: true })
  .extend({
    apiKey: z
      .string()
      .trim()
      .max(API_KEY_MAX_LENGTH, "That key is too long. Copy just the key."),
  })

type ProviderKeyFields = z.infer<typeof providerKeyFieldsSchema>

export function checkProviderKey(
  value: ProviderKeyFields,
  ctx: z.RefinementCtx,
  path: string[] = []
) {
  if (value.provider === "openai_compatible") {
    if (!httpUrlSchema.safeParse(value.baseUrl).success) {
      ctx.addIssue({
        code: "custom",
        path: [...path, "baseUrl"],
        message:
          "Enter your server's address, like https://ai.your-company.example/v1.",
      })
    }
    if (value.apiKey && /\s/.test(value.apiKey)) {
      ctx.addIssue({
        code: "custom",
        path: [...path, "apiKey"],
        message: "Keys have no spaces. Copy the key again.",
      })
    }
    return
  }
  const label = PROVIDER_INFO[value.provider].label
  if (!value.apiKey) {
    ctx.addIssue({
      code: "custom",
      path: [...path, "apiKey"],
      message: `Paste the key from your ${label} account.`,
    })
  } else if (
    value.apiKey.length < API_KEY_MIN_LENGTH ||
    /\s/.test(value.apiKey)
  ) {
    ctx.addIssue({
      code: "custom",
      path: [...path, "apiKey"],
      message: `That key looks incomplete. Copy the whole key from your ${label} account.`,
    })
  }
}

export const providerKeyFormSchema = providerKeyFieldsSchema.superRefine(
  (value, ctx) => checkProviderKey(value, ctx)
)

export type ProviderKeyFormInput = z.infer<typeof providerKeyFormSchema>

export function emptyProviderKey(
  provider: Provider = "anthropic"
): ProviderKeyFormInput {
  return { provider, baseUrl: "", judgeModelId: "", apiKey: "" }
}
