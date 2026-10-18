import { createInsertSchema } from "drizzle-zod"
import { z } from "zod"
import { modelIdSchema, PICK_SAVED_PROVIDER } from "@/lib/bot-schemas"
import { chat, chatMember } from "@/server/db/schema/chats"

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

const pickedModelSchema = createInsertSchema(chatMember, {
  providerKeyId: z.uuid({ error: PICK_SAVED_PROVIDER }),
  modelId: modelIdSchema(z.string()),
})
  .pick({ providerKeyId: true, modelId: true })
  .required()

export type PickedModel = z.infer<typeof pickedModelSchema>

export const newChatSchema = createInsertSchema(chat, {
  id: () => chatIdSchema,
})
  .pick({ id: true })
  .required()
  .extend({
    botIds: z.array(z.uuid()).min(1, "Pick a teammate first."),
    message: messageSchema,
    models: z.record(z.uuid(), pickedModelSchema),
  })

export type NewChatInput = z.infer<typeof newChatSchema>

export const chatModelSchema = createInsertSchema(chatMember, {
  chatId: () => chatIdSchema,
  botId: () => z.uuid(),
})
  .pick({ chatId: true, botId: true })
  .required()
  .extend(pickedModelSchema.shape)

export type ChatModelInput = z.infer<typeof chatModelSchema>

export const chatActionSchema = z.object({
  type: z.literal("gave-back-control"),
  messageId: z.uuid(),
  control: z.object({
    tookAt: z.number(),
    gaveAt: z.number(),
    botId: z.uuid(),
  }),
})
