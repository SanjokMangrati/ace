import "server-only"
import { and, desc, eq, notInArray } from "drizzle-orm"
import { db } from "@/server/db/client"
import { chat, screenshot } from "@/server/db/schema"

const KEPT_PER_CHAT = 60

export async function saveScreenshot(chatId: string, data: Buffer) {
  return db.transaction(async (tx) => {
    const [row] = await tx
      .insert(screenshot)
      .values({ chatId, data })
      .returning({ id: screenshot.id })
    const newest = tx
      .select({ id: screenshot.id })
      .from(screenshot)
      .where(eq(screenshot.chatId, chatId))
      .orderBy(desc(screenshot.createdAt))
      .limit(KEPT_PER_CHAT)
    await tx
      .delete(screenshot)
      .where(
        and(eq(screenshot.chatId, chatId), notInArray(screenshot.id, newest))
      )
    return row.id
  })
}

export async function loadScreenshot(id: string) {
  const [row] = await db
    .select({ data: screenshot.data })
    .from(screenshot)
    .where(eq(screenshot.id, id))
  return row?.data ?? null
}

export async function findScreenshot(userId: string, id: string) {
  const [row] = await db
    .select({ data: screenshot.data })
    .from(screenshot)
    .innerJoin(chat, eq(chat.id, screenshot.chatId))
    .where(and(eq(screenshot.id, id), eq(chat.userId, userId)))
  return row?.data ?? null
}
