import { PROVIDERS, type ProviderModels } from "@/lib/models"
import type { ModelCatalog } from "@/server/ports/model-catalog"

export function createFakeModelCatalog(
  models: Partial<ProviderModels>
): ModelCatalog {
  const all = Object.fromEntries(
    PROVIDERS.map((provider) => [provider, models[provider] ?? []])
  ) as ProviderModels
  return {
    listAll: async () => all,
    list: async (provider) => all[provider],
    find: async (provider, modelId) =>
      all[provider].find((model) => model.id === modelId),
  }
}
