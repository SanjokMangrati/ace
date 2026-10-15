import type { UIMessage } from "ai"
import { relations } from "drizzle-orm"
import {
  boolean,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core"
import { user } from "./auth"
import { bot } from "./bots"

export const turnEndReason = pgEnum("turn_end_reason", [
  "done",
  "stopped",
  "step_limit",
  "task_budget",
  "daily_budget",
  "error",
])

export type RuntimeCursors = {
  lastOutEventId?: string
  lastInEventId?: string
}

export const chat = pgTable(
  "chat",
  {
    id: uuid("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    botId: uuid("bot_id")
      .notNull()
      .references(() => bot.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    runtimeState: jsonb("runtime_state"),
    runtimeCursors: jsonb("runtime_cursors").$type<RuntimeCursors>(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("chat_userId_updatedAt_idx").on(table.userId, table.updatedAt),
    index("chat_botId_idx").on(table.botId),
  ]
)

export const message = pgTable(
  "message",
  {
    chatId: uuid("chat_id")
      .notNull()
      .references(() => chat.id, { onDelete: "cascade" }),
    id: text("id").notNull(),
    position: integer("position").notNull(),
    role: text("role").$type<UIMessage["role"]>().notNull(),
    parts: jsonb("parts").$type<UIMessage["parts"]>().notNull(),
    metadata: jsonb("metadata"),
    final: boolean("final").default(true).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.chatId, table.id] }),
    index("message_chatId_position_idx").on(table.chatId, table.position),
  ]
)

export const turn = pgTable(
  "turn",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    chatId: uuid("chat_id")
      .notNull()
      .references(() => chat.id, { onDelete: "cascade" }),
    botId: uuid("bot_id")
      .notNull()
      .references(() => bot.id, { onDelete: "cascade" }),
    stepCount: integer("step_count").default(0).notNull(),
    inputTokens: integer("input_tokens").default(0).notNull(),
    outputTokens: integer("output_tokens").default(0).notNull(),
    costUsd: numeric("cost_usd", { precision: 12, scale: 6, mode: "number" })
      .default(0)
      .notNull(),
    endReason: turnEndReason("end_reason"),
    startedAt: timestamp("started_at").defaultNow().notNull(),
    endedAt: timestamp("ended_at"),
  },
  (table) => [
    index("turn_chatId_idx").on(table.chatId),
    index("turn_botId_startedAt_idx").on(table.botId, table.startedAt),
  ]
)

export const chatRelations = relations(chat, ({ one, many }) => ({
  user: one(user, { fields: [chat.userId], references: [user.id] }),
  bot: one(bot, { fields: [chat.botId], references: [bot.id] }),
  messages: many(message),
  turns: many(turn),
}))

export const messageRelations = relations(message, ({ one }) => ({
  chat: one(chat, { fields: [message.chatId], references: [chat.id] }),
}))

export const turnRelations = relations(turn, ({ one }) => ({
  chat: one(chat, { fields: [turn.chatId], references: [chat.id] }),
}))
