import { randomUUID } from "node:crypto"
import { beforeEach, describe, expect, it } from "vitest"
import type { BlobStore } from "@/server/ports/blob-store"

export function blobStoreContract(name: string, make: () => BlobStore) {
  describe(`${name} BlobStore contract`, () => {
    let blobs: BlobStore
    let root: string

    beforeEach(() => {
      blobs = make()
      root = `contract/${randomUUID()}`
    })

    it("gives back what was put", async () => {
      const blob = { data: Buffer.from([1, 2, 3]), type: "image/png" }
      await blobs.put(`${root}/a`, blob)
      expect(await blobs.get(`${root}/a`)).toEqual(blob)
    })

    it("has nothing under a key that was never put", async () => {
      expect(await blobs.get(`${root}/missing`)).toBeNull()
    })

    it("replaces a blob put again under the same key", async () => {
      await blobs.put(`${root}/a`, {
        data: Buffer.from("old"),
        type: "text/plain",
      })
      await blobs.put(`${root}/a`, {
        data: Buffer.from("new"),
        type: "image/gif",
      })
      expect(await blobs.get(`${root}/a`)).toEqual({
        data: Buffer.from("new"),
        type: "image/gif",
      })
    })

    it("deletes only the given keys", async () => {
      const blob = { data: Buffer.from("x"), type: "text/plain" }
      await Promise.all(
        ["a", "b", "c"].map((key) => blobs.put(`${root}/${key}`, blob))
      )
      await blobs.delete([`${root}/a`, `${root}/c`])
      await blobs.delete([])
      expect(await blobs.get(`${root}/a`)).toBeNull()
      expect(await blobs.get(`${root}/b`)).toEqual(blob)
      expect(await blobs.get(`${root}/c`)).toBeNull()
    })

    it("deletes every key under a prefix and nothing beside it", async () => {
      const blob = { data: Buffer.from("x"), type: "text/plain" }
      const keys = [`${root}/chat/1`, `${root}/chat/2/deep`, `${root}/chats/3`]
      await Promise.all(keys.map((key) => blobs.put(key, blob)))
      await blobs.deletePrefix(`${root}/chat/`)
      expect(await blobs.get(keys[0])).toBeNull()
      expect(await blobs.get(keys[1])).toBeNull()
      expect(await blobs.get(keys[2])).toEqual(blob)
    })
  })
}
