import "server-only"
import { type Failure, fail } from "@/lib/action-result"
import { providerLabel } from "@/lib/models"
import type { ProviderKeyFormInput } from "@/lib/provider-key-schemas"
import { keyVault, models } from "@/server/container"
import type { NewProviderKey } from "@/server/db/queries/provider-keys"
import { env } from "@/server/env"

export async function sealProviderKey(
  input: ProviderKeyFormInput
): Promise<{ ok: true; key: NewProviderKey } | Failure<"provider" | "apiKey">> {
  const custom = input.provider === "openai_compatible"
  if (custom && !env.ALLOW_CUSTOM_BASE_URL) {
    return fail(
      "This server only allows Anthropic, OpenAI and Google.",
      "provider"
    )
  }
  const baseUrl = custom ? input.baseUrl || null : null
  if (
    await models.rejectsKey({
      provider: input.provider,
      apiKey: input.apiKey || undefined,
      baseUrl,
    })
  ) {
    const label = providerLabel(input.provider)
    return fail(
      `${label} didn't accept this key. Copy it again from your ${label} account and paste it once.`,
      "apiKey"
    )
  }
  return {
    ok: true,
    key: {
      provider: input.provider,
      baseUrl,
      judgeModelId: input.judgeModelId || null,
      sealedKey: input.apiKey ? keyVault.seal(input.apiKey) : null,
      keyHint: input.apiKey ? input.apiKey.slice(-4) : null,
    },
  }
}
