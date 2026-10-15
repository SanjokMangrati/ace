import { type Provider, providerLabel } from "@/lib/models"

export function hostOf(baseUrl: string | null) {
  if (!baseUrl) return null
  try {
    return new URL(baseUrl).host
  } catch {
    return baseUrl
  }
}

export function providerKeyDetail(key: {
  provider: Provider
  baseUrl: string | null
  keyHint: string | null
}) {
  if (key.provider === "openai_compatible") {
    return hostOf(key.baseUrl) ?? providerLabel(key.provider)
  }
  return key.keyHint ? `Key ending in ${key.keyHint}` : "Key saved"
}

export function providerKeyOptions(
  keys: {
    id: string
    provider: Provider
    baseUrl: string | null
    keyHint: string | null
  }[]
) {
  return keys.map((key) => ({
    id: key.id,
    provider: key.provider,
    label: providerLabel(key.provider),
    detail: providerKeyDetail(key),
  }))
}
