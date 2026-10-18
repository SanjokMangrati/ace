import "server-only"
import { and, asc, eq } from "drizzle-orm"
import { type Db, db } from "@/server/db/client"
import { bot, providerKey } from "@/server/db/schema"

export async function listProviderKeys(userId: string) {
  const rows = await db.query.providerKey.findMany({
    where: eq(providerKey.userId, userId),
    columns: { id: true, provider: true, baseUrl: true, keyHint: true },
    with: { bots: { columns: { name: true }, orderBy: asc(bot.name) } },
    orderBy: asc(providerKey.createdAt),
  })
  return rows.map(({ bots, ...row }) => ({
    ...row,
    usedBy: bots.map((item) => item.name),
  }))
}

export async function findProviderKey(userId: string, id: string) {
  const row = await db.query.providerKey.findFirst({
    where: and(eq(providerKey.id, id), eq(providerKey.userId, userId)),
    columns: { id: true, provider: true },
  })
  return row ?? null
}

export type NewProviderKey = Pick<
  typeof providerKey.$inferSelect,
  "provider" | "baseUrl" | "judgeModelId" | "sealedKey" | "keyHint"
>

export async function insertProviderKey(
  values: NewProviderKey & { userId: string },
  executor: Pick<Db, "insert"> = db
) {
  const [row] = await executor
    .insert(providerKey)
    .values(values)
    .returning({ id: providerKey.id })
  return row
}

export async function deleteProviderKey(userId: string, id: string) {
  const rows = await db
    .delete(providerKey)
    .where(and(eq(providerKey.id, id), eq(providerKey.userId, userId)))
    .returning({ id: providerKey.id })
  return rows.length > 0
}
