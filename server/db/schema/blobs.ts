import { customType, pgTable, text, timestamp } from "drizzle-orm/pg-core"

const bytea = customType<{ data: Buffer; driverData: Uint8Array }>({
  dataType: () => "bytea",
  fromDriver: (value) => Buffer.from(value),
})

export const blob = pgTable("blob", {
  key: text("key").primaryKey(),
  type: text("type").notNull(),
  data: bytea("data").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
})
