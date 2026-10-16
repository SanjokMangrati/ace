import "server-only"
import { and, eq, sql } from "drizzle-orm"
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

export async function findTakeover(botId: string) {
  const [row] = await db
    .select({ waitRef: sandbox.takeoverWaitRef, since: sandbox.controlSince })
    .from(sandbox)
    .where(and(eq(sandbox.botId, botId), eq(sandbox.control, "user")))
  return row?.waitRef ? { waitRef: row.waitRef, since: row.since } : null
}

const owned = (userId: string) =>
  sql`exists (select 1 from ${bot} where ${bot.id} = ${sandbox.botId} and ${bot.userId} = ${userId})`

export async function takeControl(
  userId: string,
  values: { botId: string; chatId: string; waitRef: string }
) {
  const rows = await db
    .update(sandbox)
    .set({
      control: "user",
      controlChatId: values.chatId,
      controlSince: new Date(),
      takeoverWaitRef: values.waitRef,
    })
    .where(
      and(
        eq(sandbox.botId, values.botId),
        eq(sandbox.control, "bot"),
        owned(userId)
      )
    )
    .returning({ id: sandbox.id })
  return rows.length > 0
}

const handedBack = {
  control: "bot",
  controlChatId: null,
  controlSince: null,
  takeoverWaitRef: null,
} as const

export async function giveBackControl(
  userId: string,
  botId: string,
  chatId?: string
) {
  return db.transaction(async (tx) => {
    const [row] = await tx
      .select({ waitRef: sandbox.takeoverWaitRef, since: sandbox.controlSince })
      .from(sandbox)
      .where(
        and(
          eq(sandbox.botId, botId),
          eq(sandbox.control, "user"),
          chatId ? eq(sandbox.controlChatId, chatId) : undefined,
          owned(userId)
        )
      )
      .for("update")
    if (!row) return null
    await tx.update(sandbox).set(handedBack).where(eq(sandbox.botId, botId))
    return row
  })
}

export async function endTakeover(botId: string, waitRef: string) {
  await db
    .update(sandbox)
    .set(handedBack)
    .where(and(eq(sandbox.botId, botId), eq(sandbox.takeoverWaitRef, waitRef)))
}
