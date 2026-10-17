import "server-only"
import { and, eq } from "drizzle-orm"
import { db } from "@/server/db/client"
import { note } from "@/server/db/schema"

export async function insertNote(botId: string, content: string) {
  const [row] = await db
    .insert(note)
    .values({ botId, content })
    .returning({ id: note.id })
  return row.id
}

export async function updateNote(botId: string, id: string, content: string) {
  const rows = await db
    .update(note)
    .set({ content })
    .where(and(eq(note.id, id), eq(note.botId, botId)))
    .returning({ id: note.id })
  return rows.length > 0
}

export async function deleteNote(botId: string, id: string) {
  const [row] = await db
    .delete(note)
    .where(and(eq(note.id, id), eq(note.botId, botId)))
    .returning({ content: note.content })
  return row?.content ?? null
}
