import { eq, inArray, sql } from "drizzle-orm"
import { db } from "@/server/db/client"
import { blob } from "@/server/db/schema"
import type { BlobStore } from "@/server/ports/blob-store"

export function createPostgresBlobStore(): BlobStore {
  return {
    put: async (key, { data, type }) => {
      await db
        .insert(blob)
        .values({ key, data, type })
        .onConflictDoUpdate({
          target: blob.key,
          set: { data, type, createdAt: new Date() },
        })
    },
    get: async (key) => {
      const [row] = await db
        .select({ data: blob.data, type: blob.type })
        .from(blob)
        .where(eq(blob.key, key))
      return row ?? null
    },
    delete: async (keys) => {
      if (keys.length === 0) return
      await db.delete(blob).where(inArray(blob.key, keys))
    },
    deletePrefix: async (prefix) => {
      await db.delete(blob).where(sql`starts_with(${blob.key}, ${prefix})`)
    },
  }
}
