import { pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core"
import { bot } from "./bots"
import { chat } from "./chats"

export const desktopControl = pgEnum("desktop_control", ["bot", "user"])

export const sandbox = pgTable("sandbox", {
  id: uuid("id").primaryKey().defaultRandom(),
  botId: uuid("bot_id")
    .notNull()
    .unique()
    .references(() => bot.id, { onDelete: "cascade" }),
  provider: text("provider").notNull(),
  providerRef: text("provider_ref").notNull(),
  control: desktopControl("control").default("bot").notNull(),
  controlChatId: uuid("control_chat_id").references(() => chat.id, {
    onDelete: "set null",
  }),
  controlSince: timestamp("control_since"),
  takeoverWaitRef: text("takeover_wait_ref"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
})
