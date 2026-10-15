import { createAnthropic } from "@ai-sdk/anthropic"
import { createGoogle } from "@ai-sdk/google"
import { createOpenAI } from "@ai-sdk/openai"
import { createOpenAICompatible } from "@ai-sdk/openai-compatible"
import type { ModelRegistry } from "@/server/ports/models"

export function createAiSdkModels(): ModelRegistry {
  return {
    languageModel({ provider, apiKey, baseUrl }, modelId) {
      switch (provider) {
        case "anthropic":
          return createAnthropic({ apiKey })(modelId)
        case "openai":
          return createOpenAI({ apiKey })(modelId)
        case "google":
          return createGoogle({ apiKey })(modelId)
        case "openai_compatible":
          return createOpenAICompatible({
            name: "custom",
            apiKey,
            baseURL: baseUrl ?? "",
          })(modelId)
      }
    },
  }
}
