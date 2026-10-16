import type { LanguageModel, Tool } from "ai"
import type { Provider } from "@/lib/models"
import type { ComputerHandlers } from "./computer"

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
  nativeComputerTool(
    provider: Provider,
    modelId: string,
    handlers: ComputerHandlers
  ): Tool | undefined
}
