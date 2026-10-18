import type { LanguageModel } from "ai"
import type { ModelRegistry } from "@/server/ports/models"

export function createFakeModels(options: {
  model: (modelId: string) => LanguageModel
  rejectedKeys?: string[]
}): ModelRegistry {
  const rejected = new Set(options.rejectedKeys)
  return {
    languageModel: (_credentials, modelId) => options.model(modelId),
    rejectsKey: async ({ apiKey }) =>
      apiKey !== undefined && rejected.has(apiKey),
    nativeComputerTool: () => undefined,
  }
}
