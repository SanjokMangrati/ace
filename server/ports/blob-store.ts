export type StoredBlob = { data: Buffer; type: string }

export interface BlobStore {
  put(key: string, blob: StoredBlob): Promise<void>
  get(key: string): Promise<StoredBlob | null>
  delete(keys: string[]): Promise<void>
  deletePrefix(prefix: string): Promise<void>
}
