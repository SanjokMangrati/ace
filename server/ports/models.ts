import type { LanguageModel } from "ai"
import type { Provider } from "@/lib/models"

type ProviderCredentials = {
  provider: Provider
  apiKey: string | undefined
  baseUrl: string | null
}

export interface ModelRegistry {
  languageModel(
    credentials: ProviderCredentials,
    modelId: string
  ): LanguageModel
  rejectsKey(credentials: ProviderCredentials): Promise<boolean>
}
