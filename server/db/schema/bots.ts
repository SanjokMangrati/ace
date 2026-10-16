import { relations } from "drizzle-orm"
import {
  boolean,
  customType,
  index,
  integer,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core"
import { user } from "./auth"

export const bytea = customType<{ data: Buffer; driverData: Buffer }>({
  dataType: () => "bytea",
})

export const providerKind = pgEnum("provider_kind", [
  "anthropic",
  "openai",
  "google",
  "openai_compatible",
])

export const toolGroup = pgEnum("tool_group", [
  "shell",
  "files_write",
  "computer",
  "files_read",
  "notes",
  "handoff",
])

export const providerKey = pgTable(
  "provider_key",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    provider: providerKind("provider").notNull(),
    baseUrl: text("base_url"),
    judgeModelId: text("judge_model_id"),
    sealedKey: text("sealed_key"),
    keyHint: text("key_hint"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [index("provider_key_userId_idx").on(table.userId)]
)

export const bot = pgTable(
  "bot",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    job: text("job").notNull(),
    instructions: text("instructions").notNull().default(""),
    picture: bytea("picture"),
    pictureType: text("picture_type"),
    providerKeyId: uuid("provider_key_id").references(() => providerKey.id, {
      onDelete: "set null",
    }),
    modelId: text("model_id").notNull(),
    fullAuto: boolean("full_auto").default(false).notNull(),
    maxSteps: integer("max_steps").default(50).notNull(),
    taskBudgetUsd: numeric("task_budget_usd", {
      precision: 10,
      scale: 2,
      mode: "number",
    })
      .default(1)
      .notNull(),
    dailyBudgetUsd: numeric("daily_budget_usd", {
      precision: 10,
      scale: 2,
      mode: "number",
    })
      .default(5)
      .notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("bot_userId_idx").on(table.userId),
    index("bot_providerKeyId_idx").on(table.providerKeyId),
  ]
)

export const botToolPolicy = pgTable(
  "bot_tool_policy",
  {
    botId: uuid("bot_id")
      .notNull()
      .references(() => bot.id, { onDelete: "cascade" }),
    tool: toolGroup("tool").notNull(),
    requiresApproval: boolean("requires_approval").notNull(),
  },
  (table) => [primaryKey({ columns: [table.botId, table.tool] })]
)

export const note = pgTable(
  "note",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    botId: uuid("bot_id")
      .notNull()
      .references(() => bot.id, { onDelete: "cascade" }),
    content: text("content").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index("note_botId_idx").on(table.botId)]
)

export const providerKeyRelations = relations(providerKey, ({ one, many }) => ({
  user: one(user, { fields: [providerKey.userId], references: [user.id] }),
  bots: many(bot),
}))

export const botRelations = relations(bot, ({ one, many }) => ({
  user: one(user, { fields: [bot.userId], references: [user.id] }),
  providerKey: one(providerKey, {
    fields: [bot.providerKeyId],
    references: [providerKey.id],
  }),
  toolPolicies: many(botToolPolicy),
  notes: many(note),
}))

export const botToolPolicyRelations = relations(botToolPolicy, ({ one }) => ({
  bot: one(bot, { fields: [botToolPolicy.botId], references: [bot.id] }),
}))

export const noteRelations = relations(note, ({ one }) => ({
  bot: one(bot, { fields: [note.botId], references: [bot.id] }),
}))
