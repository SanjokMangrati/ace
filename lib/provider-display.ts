import { type CatalogModel, type Provider, providerLabel } from "@/lib/models"

type SavedProviderKey = {
  id: string
  provider: Provider
  baseUrl: string | null
  keyHint: string | null
}

export type ProviderKeyOption = {
  id: string
  provider: Provider
  label: string
  detail: string
}

export type ProviderKeyModels = ProviderKeyOption & { models: CatalogModel[] }

function hostOf(baseUrl: string | null) {
  if (!baseUrl) return null
  return URL.parse(baseUrl)?.host ?? baseUrl
}

function providerKeyDetail(key: SavedProviderKey) {
  if (key.provider === "openai_compatible") {
    return hostOf(key.baseUrl) ?? providerLabel(key.provider)
  }
  return key.keyHint ? `Key ending in ${key.keyHint}` : "Key saved"
}

export function providerKeyOption(key: SavedProviderKey): ProviderKeyOption {
  return {
    id: key.id,
    provider: key.provider,
    label: providerLabel(key.provider),
    detail: providerKeyDetail(key),
  }
}
