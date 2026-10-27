import type { ProviderMetadata, UIMessage } from "ai"

function withoutItemId(metadata: ProviderMetadata | undefined) {
  if (!metadata) return metadata
  return Object.fromEntries(
    Object.entries(metadata).map(([provider, { itemId: _itemId, ...rest }]) => [
      provider,
      rest,
    ])
  )
}

export function forgetItemIds<T extends UIMessage>(message: T): T {
  return {
    ...message,
    parts: message.parts.map((part) => ({
      ...part,
      ...("providerMetadata" in part && {
        providerMetadata: withoutItemId(part.providerMetadata),
      }),
      ...("callProviderMetadata" in part && {
        callProviderMetadata: withoutItemId(part.callProviderMetadata),
      }),
    })),
  }
}
