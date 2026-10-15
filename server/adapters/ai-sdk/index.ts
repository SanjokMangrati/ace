import { createAnthropic } from "@ai-sdk/anthropic"
import { createGoogle } from "@ai-sdk/google"
import { createOpenAI } from "@ai-sdk/openai"
import { createOpenAICompatible } from "@ai-sdk/openai-compatible"
import type { Provider } from "@/lib/models"
import type { ModelRegistry } from "@/server/ports/models"

const KEY_CHECK_TIMEOUT_MS = 10_000

const keyChecks: Record<
  Exclude<Provider, "openai_compatible">,
  (apiKey: string) => {
    url: string
    headers: Record<string, string>
    rejected: number[]
  }
> = {
  anthropic: (apiKey) => ({
    url: "https://api.anthropic.com/v1/models?limit=1",
    headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
    rejected: [401, 403],
  }),
  openai: (apiKey) => ({
    url: "https://api.openai.com/v1/models",
    headers: { Authorization: `Bearer ${apiKey}` },
    rejected: [401, 403],
  }),
  google: (apiKey) => ({
    url: "https://generativelanguage.googleapis.com/v1beta/models?pageSize=1",
    headers: { "x-goog-api-key": apiKey },
    rejected: [400, 401, 403],
  }),
}

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
    async rejectsKey({ provider, apiKey }) {
      if (provider === "openai_compatible" || !apiKey) return false
      const check = keyChecks[provider](apiKey)
      try {
        const response = await fetch(check.url, {
          headers: check.headers,
          signal: AbortSignal.timeout(KEY_CHECK_TIMEOUT_MS),
        })
        return check.rejected.includes(response.status)
      } catch {
        return false
      }
    },
  }
}
