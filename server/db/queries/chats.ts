import "server-only"
import type { UIMessage } from "ai"
import {
  and,
  desc,
  eq,
  exists,
  gt,
  gte,
  inArray,
  isNotNull,
  isNull,
  sql,
  sum,
} from "drizzle-orm"
import type { TeammateMessage } from "@/lib/chat"
import { db } from "@/server/db/client"
import {
  bot,
  chat,
  message,
  type RuntimeCursors,
  sandbox,
  sandboxWaiter,
  toolCall,
  turn,
  type turnEndReason,
} from "@/server/db/schema"

export type TurnEndReason = (typeof turnEndReason.enumValues)[number]

type TranscriptChange =
  | { op: "put"; message: UIMessage; final?: boolean }
  | { op: "remove"; id: string }
  | { op: "truncateAfter"; afterId: string }
  | { op: "state"; value: unknown }

const working = exists(
  db
    .select({ id: turn.id })
    .from(turn)
    .where(and(eq(turn.chatId, chat.id), isNull(turn.endedAt)))
)

const queued = exists(
  db
    .select({ id: turn.id })
    .from(turn)
    .innerJoin(sandboxWaiter, eq(sandboxWaiter.turnId, turn.id))
    .where(and(eq(turn.chatId, chat.id), isNull(turn.endedAt)))
)

const inControl = exists(
  db
    .select({ id: sandbox.id })
    .from(sandbox)
    .where(and(eq(sandbox.controlChatId, chat.id), eq(sandbox.control, "user")))
)

const botColumns = {
  id: bot.id,
  name: bot.name,
  hasPicture: sql<boolean>`${isNotNull(bot.picture)}`,
  updatedAt: bot.updatedAt,
}

export async function listChats(userId: string) {
  return db
    .select({
      id: chat.id,
      title: chat.title,
      updatedAt: chat.updatedAt,
      working: sql<boolean>`${working}`,
      queued: sql<boolean>`${queued}`,
      inControl: sql<boolean>`${inControl}`,
      bot: botColumns,
    })
    .from(chat)
    .innerJoin(bot, eq(bot.id, chat.botId))
    .where(eq(chat.userId, userId))
    .orderBy(desc(chat.updatedAt))
}

export async function findChat(userId: string, id: string) {
  const [row] = await db
    .select({
      id: chat.id,
      title: chat.title,
      cursors: chat.runtimeCursors,
      bot: {
        ...botColumns,
        connected: sql<boolean>`${isNotNull(bot.providerKeyId)}`,
      },
      control: sandbox.control,
    })
    .from(chat)
    .innerJoin(bot, eq(bot.id, chat.botId))
    .leftJoin(sandbox, eq(sandbox.botId, chat.botId))
    .where(and(eq(chat.id, id), eq(chat.userId, userId)))
  if (!row) return null
  const { messages } = await loadTranscript<TeammateMessage>(id)
  return { ...row, messages }
}

export async function ownsChat(userId: string, id: string) {
  const rows = await db
    .select({ id: chat.id })
    .from(chat)
    .where(and(eq(chat.id, id), eq(chat.userId, userId)))
  return rows.length > 0
}

export async function findChatBotId(userId: string, id: string) {
  const [row] = await db
    .select({ botId: chat.botId })
    .from(chat)
    .where(and(eq(chat.id, id), eq(chat.userId, userId)))
  return row?.botId ?? null
}

export async function listBotChatIds(userId: string, botId: string) {
  const rows = await db
    .select({ id: chat.id })
    .from(chat)
    .where(and(eq(chat.botId, botId), eq(chat.userId, userId)))
  return rows.map((row) => row.id)
}

export async function insertChat(
  userId: string,
  values: { id: string; botId: string; title: string }
) {
  const owned = await db.$count(
    bot,
    and(eq(bot.id, values.botId), eq(bot.userId, userId))
  )
  if (owned === 0) return false
  await db.insert(chat).values({ ...values, userId })
  return true
}

export async function deleteChat(userId: string, id: string) {
  const rows = await db
    .delete(chat)
    .where(and(eq(chat.id, id), eq(chat.userId, userId)))
    .returning({ id: chat.id })
  return rows.length > 0
}

export async function findChatContext(chatId: string) {
  const row = await db.query.chat.findFirst({
    where: eq(chat.id, chatId),
    columns: { id: true },
    with: {
      bot: {
        columns: {
          id: true,
          name: true,
          job: true,
          instructions: true,
          modelId: true,
          maxSteps: true,
          taskBudgetUsd: true,
          dailyBudgetUsd: true,
        },
        with: {
          providerKey: {
            columns: { provider: true, baseUrl: true, sealedKey: true },
          },
          notes: {
            columns: { id: true, content: true },
            orderBy: (note) => desc(note.updatedAt),
          },
        },
      },
    },
  })
  return row?.bot ?? null
}

export async function loadTranscript<TMessage extends UIMessage = UIMessage>(
  chatId: string,
  opts: { limit?: number; before?: string } = {}
) {
  const [row] = await db
    .select({ state: chat.runtimeState, cursors: chat.runtimeCursors })
    .from(chat)
    .where(eq(chat.id, chatId))

  const before = opts.before
    ? db
        .select({ position: message.position })
        .from(message)
        .where(and(eq(message.chatId, chatId), eq(message.id, opts.before)))
    : undefined

  const query = db
    .select({
      id: message.id,
      role: message.role,
      parts: message.parts,
      metadata: message.metadata,
      final: message.final,
    })
    .from(message)
    .where(
      and(
        eq(message.chatId, chatId),
        before && sql`${message.position} < (${before})`
      )
    )
    .orderBy(desc(message.position))
    .$dynamic()
  const rows = await (opts.limit === undefined
    ? query
    : query.limit(opts.limit + 1))

  const hasMore = opts.limit !== undefined && rows.length > opts.limit
  const page = (hasMore ? rows.slice(0, opts.limit) : rows).reverse()

  return {
    messages: page.map(
      ({ final: _final, metadata, ...rest }) =>
        ({ ...rest, ...(metadata !== null && { metadata }) }) as TMessage
    ),
    nonFinalIds: page.filter((row) => !row.final).map((row) => row.id),
    state: row?.state ?? null,
    cursors: row?.cursors ?? undefined,
    nextCursor: hasMore ? page[0]?.id : undefined,
  }
}

export async function saveTranscript(
  chatId: string,
  changes: readonly TranscriptChange[],
  cursors: RuntimeCursors | undefined
) {
  await db.transaction(async (tx) => {
    await tx
      .select({ id: chat.id })
      .from(chat)
      .where(eq(chat.id, chatId))
      .for("update")

    for (const change of changes) {
      if (change.op === "put") {
        const { id, role, parts, metadata } = change.message
        const final = change.final ?? true
        await tx
          .insert(message)
          .values({
            chatId,
            id,
            role,
            parts,
            metadata: metadata ?? null,
            final,
            position: sql`(select coalesce(max(${message.position}), -1) + 1 from ${message} where ${message.chatId} = ${chatId})`,
          })
          .onConflictDoUpdate({
            target: [message.chatId, message.id],
            set: { role, parts, metadata: metadata ?? null, final },
          })
      } else if (change.op === "remove") {
        await tx
          .delete(message)
          .where(and(eq(message.chatId, chatId), eq(message.id, change.id)))
      } else if (change.op === "truncateAfter") {
        const anchor = tx
          .select({ position: message.position })
          .from(message)
          .where(
            and(eq(message.chatId, chatId), eq(message.id, change.afterId))
          )
        await tx
          .delete(message)
          .where(
            and(
              eq(message.chatId, chatId),
              gt(message.position, sql`(${anchor})`)
            )
          )
      } else {
        await tx
          .update(chat)
          .set({ runtimeState: change.value })
          .where(eq(chat.id, chatId))
      }
    }

    if (cursors) {
      await tx
        .update(chat)
        .set({ runtimeCursors: cursors })
        .where(eq(chat.id, chatId))
    }
  })
}

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0]

async function endOpenTurns(tx: Tx, chatId: string) {
  const ended = await tx
    .update(turn)
    .set({ endReason: "error", endedAt: new Date() })
    .where(and(eq(turn.chatId, chatId), isNull(turn.endedAt)))
    .returning({ id: turn.id, botId: turn.botId })
  if (ended.length > 0) {
    await tx
      .update(toolCall)
      .set({ status: "interrupted", finishedAt: new Date() })
      .where(
        and(
          inArray(
            toolCall.turnId,
            ended.map((row) => row.id)
          ),
          eq(toolCall.status, "started")
        )
      )
  }
  return ended
}

async function interruptedCalls(tx: Tx, chatId: string) {
  const [last] = await tx
    .select({ id: turn.id })
    .from(turn)
    .where(eq(turn.chatId, chatId))
    .orderBy(desc(turn.startedAt))
    .limit(1)
  if (!last) return []
  const calls = await tx
    .select({
      toolName: toolCall.toolName,
      input: toolCall.input,
      status: toolCall.status,
    })
    .from(toolCall)
    .where(eq(toolCall.turnId, last.id))
    .orderBy(toolCall.startedAt)
  return calls.some((call) => call.status === "interrupted") ? calls : []
}

export async function startTurn(chatId: string, botId: string) {
  return db.transaction(async (tx) => {
    await endOpenTurns(tx, chatId)
    const interrupted = await interruptedCalls(tx, chatId)
    await tx
      .update(chat)
      .set({ updatedAt: new Date() })
      .where(eq(chat.id, chatId))
    const [row] = await tx
      .insert(turn)
      .values({ chatId, botId })
      .returning({ id: turn.id })
    return { id: row.id, interrupted }
  })
}

export async function finishTurn(
  id: string,
  values: {
    endReason: TurnEndReason
    stepCount: number
    inputTokens: number
    outputTokens: number
    costUsd: number
  }
) {
  await db
    .update(turn)
    .set({ ...values, endedAt: new Date() })
    .where(eq(turn.id, id))
}

export async function endRunningTurns(chatId: string) {
  return db.transaction((tx) => endOpenTurns(tx, chatId))
}

export async function spentSince(botId: string, since: Date) {
  const [row] = await db
    .select({ total: sum(turn.costUsd).mapWith(Number) })
    .from(turn)
    .where(and(eq(turn.botId, botId), gte(turn.startedAt, since)))
  return row?.total ?? 0
}
