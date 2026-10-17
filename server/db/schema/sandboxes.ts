import {
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core"
import { bot } from "./bots"
import { chat, turn } from "./chats"

export const desktopControl = pgEnum("desktop_control", ["bot", "user"])

export const sandbox = pgTable("sandbox", {
  id: uuid("id").primaryKey().defaultRandom(),
  botId: uuid("bot_id")
    .notNull()
    .unique()
    .references(() => bot.id, { onDelete: "cascade" }),
  provider: text("provider"),
  providerRef: text("provider_ref"),
  control: desktopControl("control").default("bot").notNull(),
  controlChatId: uuid("control_chat_id").references(() => chat.id, {
    onDelete: "set null",
  }),
  controlSince: timestamp("control_since"),
  takeoverWaitRef: text("takeover_wait_ref"),
  leaseTurnId: uuid("lease_turn_id").references(() => turn.id, {
    onDelete: "set null",
  }),
  leaseExpiresAt: timestamp("lease_expires_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
})

export const sandboxWaiter = pgTable(
  "sandbox_waiter",
  {
    turnId: uuid("turn_id")
      .primaryKey()
      .references(() => turn.id, { onDelete: "cascade" }),
    sandboxId: uuid("sandbox_id")
      .notNull()
      .references(() => sandbox.id, { onDelete: "cascade" }),
    waitRef: text("wait_ref").notNull(),
    enqueuedAt: timestamp("enqueued_at").defaultNow().notNull(),
  },
  (table) => [
    index("sandbox_waiter_sandboxId_enqueuedAt_idx").on(
      table.sandboxId,
      table.enqueuedAt
    ),
  ]
)
