import "server-only"
import type { Provider } from "@/lib/models"
import {
  type ProviderKeyModels,
  providerKeyOption,
} from "@/lib/provider-display"
import {
  keyVault,
  logger,
  modelCatalog,
  serverModels,
} from "@/server/container"
import { listProviderKeySecrets } from "@/server/db/queries/provider-keys"

export async function isListedModel(provider: Provider, modelId: string) {
  return (
    provider === "openai_compatible" ||
    (await modelCatalog.find(provider, modelId)) !== undefined
  )
}

export async function listProviderKeyModels(
  userId: string
): Promise<ProviderKeyModels[]> {
  const keys = await listProviderKeySecrets(userId)
  if (keys.length === 0) return []
  const catalog = await modelCatalog.listAll()
  return Promise.all(
    keys.map(async ({ sealedKey, ...key }) => {
      const option = providerKeyOption(key)
      if (key.provider !== "openai_compatible") {
        return { ...option, models: catalog[key.provider] }
      }
      if (!key.baseUrl) return { ...option, models: [] }
      const models = await serverModels
        .list({
          baseUrl: key.baseUrl,
          apiKey: sealedKey ? keyVault.open(sealedKey) : undefined,
        })
        .catch((error) => {
          logger.warn("Model list unavailable", {
            host: option.detail,
            err: error,
          })
          return []
        })
      return { ...option, models }
    })
  )
}
