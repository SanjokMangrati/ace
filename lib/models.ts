import { providerKind } from "@/server/db/schema/bots"

export const PROVIDERS = providerKind.enumValues

export type Provider = (typeof PROVIDERS)[number]

export type CatalogModel = {
  id: string
  label: string
  vision: boolean
  inputUsdPerMTok: number
  outputUsdPerMTok: number
}

export type ProviderModels = Record<Provider, CatalogModel[]>

export const PROVIDER_INFO: Record<Provider, { label: string }> = {
  anthropic: { label: "Anthropic" },
  openai: { label: "OpenAI" },
  google: { label: "Google" },
  openai_compatible: { label: "Other" },
}

export function providerLabel(provider: Provider) {
  return provider === "openai_compatible"
    ? "Custom"
    : PROVIDER_INFO[provider].label
}

export function defaultModelId(models: readonly CatalogModel[]) {
  return models[0]?.id ?? ""
}
