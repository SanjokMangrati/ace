import { tool } from "ai"
import { z } from "zod"
import { deleteNote, insertNote, updateNote } from "@/server/db/queries/notes"

const content = z.string().trim().min(1).max(500)

export function noteTools(botId: () => string) {
  return {
    note_add: tool({
      description:
        "Remember something that will help in future chats with this person, like a preference or a recurring fact. Keep it short and self-contained. Never save passwords or other secrets.",
      inputSchema: z.object({ content }),
      execute: async (input) => ({
        id: await insertNote(botId(), input.content),
      }),
    }),
    note_update: tool({
      description:
        "Rewrite one of your notes when it is out of date. Use the id shown next to the note.",
      inputSchema: z.object({ id: z.uuid(), content }),
      execute: async (input) => {
        if (!(await updateNote(botId(), input.id, input.content))) {
          throw new Error("No note has this id.")
        }
        return { updated: true }
      },
    }),
    note_delete: tool({
      description:
        "Forget one of your notes when it is wrong or no longer useful. Use the id shown next to the note.",
      inputSchema: z.object({ id: z.uuid() }),
      execute: async (input) => {
        const deleted = await deleteNote(botId(), input.id)
        if (deleted === null) throw new Error("No note has this id.")
        return { content: deleted }
      },
    }),
  }
}

export type NoteTools = ReturnType<typeof noteTools>
