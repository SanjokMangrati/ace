import { providerKind } from "@/server/db/schema/bots"

export const PROVIDERS = providerKind.enumValues

export type Provider = (typeof PROVIDERS)[number]

export const MODEL_ID_MAX_LENGTH = 200
export const MODEL_ID_TOO_LONG = "That model name is too long."

export type CatalogModel = {
  id: string
  label: string
  vision: boolean
  inputUsdPerMTok: number
  outputUsdPerMTok: number
}

export type ProviderModels = Record<Provider, CatalogModel[]>

export const PROVIDER_LABELS: Record<Provider, string> = {
  anthropic: "Anthropic",
  openai: "OpenAI",
  google: "Google",
  openai_compatible: "Other",
}

export function providerLabel(provider: Provider) {
  return provider === "openai_compatible" ? "Custom" : PROVIDER_LABELS[provider]
}

export function defaultModelId(models: readonly CatalogModel[]) {
  return models[0]?.id ?? ""
}
