import "server-only"
import { and, eq, sql } from "drizzle-orm"
import { db } from "@/server/db/client"
import { chat, note } from "@/server/db/schema"

function chatBot(chatId: string) {
  return sql`(${db.select({ botId: chat.botId }).from(chat).where(eq(chat.id, chatId))})`
}

export async function insertNote(chatId: string, content: string) {
  const [row] = await db
    .insert(note)
    .values({ botId: chatBot(chatId), content })
    .returning({ id: note.id })
  return row.id
}

export async function updateNote(chatId: string, id: string, content: string) {
  const rows = await db
    .update(note)
    .set({ content })
    .where(and(eq(note.id, id), eq(note.botId, chatBot(chatId))))
    .returning({ id: note.id })
  return rows.length > 0
}

export async function deleteNote(chatId: string, id: string) {
  const [row] = await db
    .delete(note)
    .where(and(eq(note.id, id), eq(note.botId, chatBot(chatId))))
    .returning({ content: note.content })
  return row?.content ?? null
}
