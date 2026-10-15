import { createInsertSchema } from "drizzle-zod"
import { z } from "zod"
import { chat } from "@/server/db/schema/chats"

const MESSAGE_MAX_LENGTH = 20_000

export const chatIdSchema = z.uuid()

const messageSchema = z
  .string()
  .trim()
  .min(1, "Write what you'd like done.")
  .max(
    MESSAGE_MAX_LENGTH,
    `Keep your message under ${MESSAGE_MAX_LENGTH.toLocaleString("en-US")} characters.`
  )

export const newChatSchema = createInsertSchema(chat, {
  id: () => chatIdSchema,
  botId: () => z.uuid({ error: "Pick a teammate first." }),
})
  .pick({ id: true, botId: true })
  .required()
  .extend({ message: messageSchema })

export type NewChatInput = z.infer<typeof newChatSchema>
