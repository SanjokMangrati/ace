import "server-only"
import { and, eq } from "drizzle-orm"
import { db } from "@/server/db/client"
import { bot, sandbox } from "@/server/db/schema"

export async function saveSandbox(values: {
  botId: string
  provider: string
  providerRef: string
}) {
  await db
    .insert(sandbox)
    .values(values)
    .onConflictDoUpdate({
      target: sandbox.botId,
      set: { provider: values.provider, providerRef: values.providerRef },
    })
}

export async function findBotSandbox(userId: string, botId: string) {
  const [row] = await db
    .select({ providerRef: sandbox.providerRef })
    .from(sandbox)
    .innerJoin(bot, eq(bot.id, sandbox.botId))
    .where(and(eq(sandbox.botId, botId), eq(bot.userId, userId)))
  return row ?? null
}
