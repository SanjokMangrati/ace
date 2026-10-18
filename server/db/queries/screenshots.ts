import "server-only"
import { and, desc, eq, notInArray } from "drizzle-orm"
import { blobKeys } from "@/server/blob-keys"
import { db } from "@/server/db/client"
import { chat, screenshot } from "@/server/db/schema"
import type { BlobStore } from "@/server/ports/blob-store"

const KEPT_PER_CHAT = 60

export async function saveScreenshot(
  blobs: BlobStore,
  chatId: string,
  data: Buffer
) {
  const [row] = await db
    .insert(screenshot)
    .values({ chatId })
    .returning({ id: screenshot.id })
  await blobs.put(blobKeys.screenshot(chatId, row.id), {
    data,
    type: "image/jpeg",
  })
  const newest = db
    .select({ id: screenshot.id })
    .from(screenshot)
    .where(eq(screenshot.chatId, chatId))
    .orderBy(desc(screenshot.createdAt))
    .limit(KEPT_PER_CHAT)
  const pruned = await db
    .delete(screenshot)
    .where(
      and(eq(screenshot.chatId, chatId), notInArray(screenshot.id, newest))
    )
    .returning({ id: screenshot.id })
  await blobs.delete(pruned.map(({ id }) => blobKeys.screenshot(chatId, id)))
  return row.id
}

async function screenshotData(blobs: BlobStore, chatId: string, id: string) {
  const stored = await blobs.get(blobKeys.screenshot(chatId, id))
  return stored?.data ?? null
}

export async function loadScreenshot(blobs: BlobStore, id: string) {
  const [row] = await db
    .select({ chatId: screenshot.chatId })
    .from(screenshot)
    .where(eq(screenshot.id, id))
  return row ? screenshotData(blobs, row.chatId, id) : null
}

export async function findScreenshot(
  blobs: BlobStore,
  userId: string,
  id: string
) {
  const [row] = await db
    .select({ chatId: screenshot.chatId })
    .from(screenshot)
    .innerJoin(chat, eq(chat.id, screenshot.chatId))
    .where(and(eq(screenshot.id, id), eq(chat.userId, userId)))
  return row ? screenshotData(blobs, row.chatId, id) : null
}
