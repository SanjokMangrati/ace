import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core"
import { bot } from "./bots"

export const sandbox = pgTable("sandbox", {
  id: uuid("id").primaryKey().defaultRandom(),
  botId: uuid("bot_id")
    .notNull()
    .unique()
    .references(() => bot.id, { onDelete: "cascade" }),
  provider: text("provider").notNull(),
  providerRef: text("provider_ref").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
})
