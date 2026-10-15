import "server-only"
import { type Failure, fail } from "@/lib/action-result"
import type { ProviderKeyFormInput } from "@/lib/provider-key-schemas"
import { keyVault } from "@/server/container"
import type { NewProviderKey } from "@/server/db/queries/provider-keys"
import { env } from "@/server/env"

export function sealProviderKey(
  input: ProviderKeyFormInput
): { ok: true; key: NewProviderKey } | Failure {
  const custom = input.provider === "openai_compatible"
  if (custom && !env.ALLOW_CUSTOM_BASE_URL) {
    return fail("This server only allows Anthropic, OpenAI and Google.")
  }
  return {
    ok: true,
    key: {
      provider: input.provider,
      baseUrl: custom ? input.baseUrl || null : null,
      judgeModelId: input.judgeModelId || null,
      sealedKey: input.apiKey ? keyVault.seal(input.apiKey) : null,
      keyHint: input.apiKey ? input.apiKey.slice(-4) : null,
    },
  }
}
