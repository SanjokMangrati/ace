import "server-only"
import {
  and,
  asc,
  eq,
  exists,
  inArray,
  isNotNull,
  isNull,
  ne,
  sql,
} from "drizzle-orm"
import type { QueueEvent } from "@/lib/chat"
import { db, type Tx } from "@/server/db/client"
import { awaitsAnswer } from "@/server/db/queries/chats"
import { bot, chat, sandbox, sandboxWaiter, turn } from "@/server/db/schema"

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

export async function findBotSandboxRef(userId: string, botId: string) {
  const [row] = await db
    .select({ providerRef: sandbox.providerRef })
    .from(sandbox)
    .innerJoin(bot, eq(bot.id, sandbox.botId))
    .where(
      and(
        eq(sandbox.botId, botId),
        eq(bot.userId, userId),
        isNotNull(sandbox.providerRef)
      )
    )
  return row?.providerRef ?? null
}

export async function findTakeover(botId: string) {
  const [row] = await db
    .select({ waitRef: sandbox.takeoverWaitRef, since: sandbox.controlSince })
    .from(sandbox)
    .where(and(eq(sandbox.botId, botId), eq(sandbox.control, "user")))
  return row?.waitRef ? { waitRef: row.waitRef, since: row.since } : null
}

const owned = (userId: string) =>
  exists(
    db
      .select({ id: bot.id })
      .from(bot)
      .where(and(eq(bot.id, sandbox.botId), eq(bot.userId, userId)))
  )

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

export type LeaseHolder = Omit<QueueEvent, "startedAt">

type LeaseClaim =
  | { acquired: true; wake: string[] }
  | {
      acquired: false
      wake: string[]
      holder: LeaseHolder
      expiresAt: Date
    }

const openTurnChat = {
  chatId: chat.id,
  title: chat.title,
  asking: sql<boolean>`${awaitsAnswer}`,
}

async function lockSandbox(tx: Tx, botId: string) {
  await tx
    .insert(sandbox)
    .values({ botId })
    .onConflictDoNothing({ target: sandbox.botId })
  const [row] = await tx
    .select({
      id: sandbox.id,
      control: sandbox.control,
      leaseTurnId: sandbox.leaseTurnId,
      leaseExpiresAt: sandbox.leaseExpiresAt,
    })
    .from(sandbox)
    .where(eq(sandbox.botId, botId))
    .for("update")
  await tx
    .delete(sandboxWaiter)
    .where(
      and(
        eq(sandboxWaiter.sandboxId, row.id),
        inArray(
          sandboxWaiter.turnId,
          tx.select({ id: turn.id }).from(turn).where(isNotNull(turn.endedAt))
        )
      )
    )
  return row
}

async function leaseHolder(tx: Tx, turnId: string) {
  const [row] = await tx
    .select(openTurnChat)
    .from(turn)
    .innerJoin(chat, eq(chat.id, turn.chatId))
    .where(and(eq(turn.id, turnId), isNull(turn.endedAt)))
  return row ?? null
}

async function headWaiter(tx: Tx, sandboxId: string) {
  const [row] = await tx
    .select({
      turnId: sandboxWaiter.turnId,
      waitRef: sandboxWaiter.waitRef,
      ...openTurnChat,
    })
    .from(sandboxWaiter)
    .innerJoin(turn, eq(turn.id, sandboxWaiter.turnId))
    .innerJoin(chat, eq(chat.id, turn.chatId))
    .where(eq(sandboxWaiter.sandboxId, sandboxId))
    .orderBy(asc(sandboxWaiter.enqueuedAt))
    .limit(1)
  return row ?? null
}

async function grantLease(
  tx: Tx,
  sandboxId: string,
  turnId: string,
  ttlMs: number
) {
  const expiresAt = new Date(Date.now() + ttlMs)
  await tx
    .update(sandbox)
    .set({ leaseTurnId: turnId, leaseExpiresAt: expiresAt })
    .where(eq(sandbox.id, sandboxId))
  await tx.delete(sandboxWaiter).where(eq(sandboxWaiter.turnId, turnId))
  return expiresAt
}

async function handOff(
  tx: Tx,
  sandboxId: string,
  head: { turnId: string; waitRef: string },
  callerTurnId: string,
  ttlMs: number
) {
  const expiresAt = await grantLease(tx, sandboxId, head.turnId, ttlMs)
  const rest = await tx
    .select({ waitRef: sandboxWaiter.waitRef })
    .from(sandboxWaiter)
    .where(
      and(
        eq(sandboxWaiter.sandboxId, sandboxId),
        ne(sandboxWaiter.turnId, callerTurnId)
      )
    )
    .orderBy(asc(sandboxWaiter.enqueuedAt))
  return { expiresAt, wake: [head.waitRef, ...rest.map((row) => row.waitRef)] }
}

export async function claimLease(
  botId: string,
  turnId: string,
  ttlMs: number,
  waitRef?: string
): Promise<LeaseClaim> {
  return db.transaction(async (tx) => {
    const row = await lockSandbox(tx, botId)
    if (row.leaseTurnId === turnId) {
      await grantLease(tx, row.id, turnId, ttlMs)
      return { acquired: true, wake: [] }
    }

    let wake: string[] = []
    let expiresAt = row.leaseExpiresAt
    let holder =
      row.leaseTurnId && expiresAt && expiresAt > new Date()
        ? await leaseHolder(tx, row.leaseTurnId)
        : null
    if (!holder || !expiresAt) {
      const head = await headWaiter(tx, row.id)
      if (!head || head.turnId === turnId) {
        await grantLease(tx, row.id, turnId, ttlMs)
        return { acquired: true, wake }
      }
      const handed = await handOff(tx, row.id, head, turnId, ttlMs)
      expiresAt = handed.expiresAt
      wake = handed.wake
      holder = head
    }

    if (waitRef) {
      await tx
        .insert(sandboxWaiter)
        .values({ turnId, sandboxId: row.id, waitRef })
        .onConflictDoUpdate({ target: sandboxWaiter.turnId, set: { waitRef } })
    }
    return {
      acquired: false,
      wake,
      holder: {
        chatId: holder.chatId,
        title: holder.title,
        waitingOn:
          row.control === "user"
            ? "control"
            : holder.asking
              ? "answer"
              : "work",
      },
      expiresAt,
    }
  })
}

export async function renewLease(botId: string, turnId: string, until: Date) {
  const rows = await db
    .update(sandbox)
    .set({ leaseExpiresAt: sql`greatest(${sandbox.leaseExpiresAt}, ${until})` })
    .where(and(eq(sandbox.botId, botId), eq(sandbox.leaseTurnId, turnId)))
    .returning({ id: sandbox.id })
  return rows.length > 0
}

export async function setLeaseExpiry(
  botId: string,
  turnId: string,
  until: Date
) {
  await db
    .update(sandbox)
    .set({ leaseExpiresAt: until })
    .where(and(eq(sandbox.botId, botId), eq(sandbox.leaseTurnId, turnId)))
}

export async function releaseLease(
  botId: string,
  turnId: string,
  ttlMs: number
) {
  return db.transaction(async (tx) => {
    const row = await lockSandbox(tx, botId)
    await tx.delete(sandboxWaiter).where(eq(sandboxWaiter.turnId, turnId))
    if (row.leaseTurnId !== turnId) return []
    const head = await headWaiter(tx, row.id)
    if (!head) {
      await tx
        .update(sandbox)
        .set({ leaseTurnId: null, leaseExpiresAt: null })
        .where(eq(sandbox.id, row.id))
      return []
    }
    const { wake } = await handOff(tx, row.id, head, turnId, ttlMs)
    return wake
  })
}

export async function listWaiterRefs(botId: string) {
  const rows = await db
    .select({ waitRef: sandboxWaiter.waitRef })
    .from(sandboxWaiter)
    .innerJoin(sandbox, eq(sandbox.id, sandboxWaiter.sandboxId))
    .where(eq(sandbox.botId, botId))
  return rows.map((row) => row.waitRef)
}
