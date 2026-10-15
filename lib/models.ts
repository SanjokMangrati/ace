export const PROVIDERS = [
  "anthropic",
  "openai",
  "google",
  "openai_compatible",
] as const

export type Provider = (typeof PROVIDERS)[number]

export type CatalogModel = {
  id: string
  label: string
  vision: boolean
  inputUsdPerMTok: number
  outputUsdPerMTok: number
}

type ProviderInfo = {
  label: string
  models: readonly CatalogModel[]
}

export const PROVIDER_INFO: Record<Provider, ProviderInfo> = {
  anthropic: {
    label: "Anthropic",
    models: [
      {
        id: "claude-sonnet-5-5",
        label: "Claude Sonnet 5.5",
        vision: true,
        inputUsdPerMTok: 2,
        outputUsdPerMTok: 10,
      },
      {
        id: "claude-opus-5-5",
        label: "Claude Opus 5.5",
        vision: true,
        inputUsdPerMTok: 4,
        outputUsdPerMTok: 20,
      },
      {
        id: "claude-fable-5-1",
        label: "Claude Fable 5.1",
        vision: true,
        inputUsdPerMTok: 10,
        outputUsdPerMTok: 50,
      },
      {
        id: "claude-haiku-5-5",
        label: "Claude Haiku 5.5",
        vision: true,
        inputUsdPerMTok: 0.1,
        outputUsdPerMTok: 0.5,
      },
    ],
  },
  openai: {
    label: "OpenAI",
    models: [
      {
        id: "gpt-6.1-sol",
        label: "GPT-6.1 Sol",
        vision: true,
        inputUsdPerMTok: 2,
        outputUsdPerMTok: 10,
      },
      {
        id: "gpt-6-astra",
        label: "GPT-6 Astra",
        vision: true,
        inputUsdPerMTok: 10,
        outputUsdPerMTok: 50,
      },
      {
        id: "gpt-6-luna",
        label: "GPT-6 Luna",
        vision: true,
        inputUsdPerMTok: 0.1,
        outputUsdPerMTok: 0.5,
      },
    ],
  },
  google: {
    label: "Google",
    models: [
      {
        id: "gemini-4-argon",
        label: "Gemini 4 Argon",
        vision: true,
        inputUsdPerMTok: 2,
        outputUsdPerMTok: 10,
      },
      {
        id: "gemini-3.8-flash",
        label: "Gemini 3.8 Flash",
        vision: true,
        inputUsdPerMTok: 0.75,
        outputUsdPerMTok: 3.75,
      },
      {
        id: "gemini-3.5-flash-lite",
        label: "Gemini 3.5 Flash Lite",
        vision: true,
        inputUsdPerMTok: 0.3,
        outputUsdPerMTok: 2.5,
      },
    ],
  },
  openai_compatible: {
    label: "Other",
    models: [],
  },
}

export function providerLabel(provider: Provider) {
  return provider === "openai_compatible"
    ? "Custom"
    : PROVIDER_INFO[provider].label
}

export function catalogModel(provider: Provider, modelId: string) {
  return PROVIDER_INFO[provider].models.find((model) => model.id === modelId)
}

export function defaultModelId(provider: Provider) {
  return PROVIDER_INFO[provider].models[0]?.id ?? ""
}
