import type { BlobStore, StoredBlob } from "@/server/ports/blob-store"

export function createMemoryBlobStore(): BlobStore {
  const blobs = new Map<string, StoredBlob>()
  return {
    put: async (key, { data, type }) => {
      blobs.set(key, { data: Buffer.from(data), type })
    },
    get: async (key) => blobs.get(key) ?? null,
    delete: async (keys) => {
      for (const key of keys) blobs.delete(key)
    },
    deletePrefix: async (prefix) => {
      for (const key of blobs.keys()) {
        if (key.startsWith(prefix)) blobs.delete(key)
      }
    },
  }
}
