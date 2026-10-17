import "server-only"
import type { UIMessage } from "ai"
import {
  and,
  asc,
  desc,
  eq,
  exists,
  gt,
  gte,
  inArray,
  isNotNull,
  isNull,
  not,
  sql,
  sum,
} from "drizzle-orm"
import { askBeforeFrom } from "@/lib/bot-schemas"
import type { TeammateMessage } from "@/lib/chat"
import type { ApprovalAnswer } from "@/server/agent/approvals"
import { db, type Tx } from "@/server/db/client"
import {
  approval,
  bot,
  chat,
  chatMember,
  handoff,
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

export const awaitsAnswer = exists(
  db
    .select({ id: approval.toolCallId })
    .from(approval)
    .where(and(eq(approval.turnId, turn.id), eq(approval.status, "pending")))
)

const openTurn = and(eq(turn.chatId, chat.id), isNull(turn.endedAt))

const working = exists(
  db
    .select({ id: turn.id })
    .from(turn)
    .where(and(openTurn, not(awaitsAnswer)))
)

const needsYou = exists(
  db.select({ id: turn.id }).from(turn).where(and(openTurn, awaitsAnswer))
)

const queued = exists(
  db
    .select({ id: turn.id })
    .from(turn)
    .innerJoin(sandboxWaiter, eq(sandboxWaiter.turnId, turn.id))
    .where(openTurn)
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

async function listMembers(chatIds: string[]) {
  const rows = await db
    .select({
      chatId: chatMember.chatId,
      ...botColumns,
      job: bot.job,
      connected: sql<boolean>`${isNotNull(bot.providerKeyId)}`,
      fullAuto: bot.fullAuto,
    })
    .from(chatMember)
    .innerJoin(bot, eq(bot.id, chatMember.botId))
    .where(inArray(chatMember.chatId, chatIds))
    .orderBy(asc(chatMember.position))
  return (chatId: string) =>
    rows
      .filter((row) => row.chatId === chatId)
      .map(({ chatId: _chatId, ...member }) => member)
}

export async function listChats(userId: string) {
  const rows = await db
    .select({
      id: chat.id,
      title: chat.title,
      updatedAt: chat.updatedAt,
      working: sql<boolean>`${working}`,
      needsYou: sql<boolean>`${needsYou}`,
      queued: sql<boolean>`${queued}`,
      inControl: sql<boolean>`${inControl}`,
    })
    .from(chat)
    .where(eq(chat.userId, userId))
    .orderBy(desc(chat.updatedAt))
  const membersOf = await listMembers(rows.map((row) => row.id))
  return rows.map((row) => ({ ...row, bots: membersOf(row.id) }))
}

async function lastTurnBotId(chatId: string) {
  const [last] = await db
    .select({ botId: turn.botId })
    .from(turn)
    .where(eq(turn.chatId, chatId))
    .orderBy(desc(turn.startedAt))
    .limit(1)
  return last?.botId ?? null
}

export async function findChat(userId: string, id: string) {
  const [row] = await db
    .select({ id: chat.id, title: chat.title, cursors: chat.runtimeCursors })
    .from(chat)
    .where(and(eq(chat.id, id), eq(chat.userId, userId)))
  if (!row) return null
  const [membersOf, [controlled], lastBotId, { messages }] = await Promise.all([
    listMembers([id]),
    db
      .select({ botId: sandbox.botId })
      .from(sandbox)
      .where(and(eq(sandbox.controlChatId, id), eq(sandbox.control, "user"))),
    lastTurnBotId(id),
    loadTranscript<TeammateMessage>(id),
  ])
  return {
    ...row,
    bots: membersOf(id),
    controlBotId: controlled?.botId ?? null,
    lastBotId,
    messages,
  }
}

export async function findChatBotIds(userId: string, id: string) {
  const rows = await db
    .select({ botId: chatMember.botId })
    .from(chatMember)
    .innerJoin(chat, eq(chat.id, chatMember.chatId))
    .where(and(eq(chat.id, id), eq(chat.userId, userId)))
  return rows.map((row) => row.botId)
}

export async function listBotChatIds(userId: string, botId: string) {
  const rows = await db
    .select({ id: chat.id })
    .from(chat)
    .innerJoin(chatMember, eq(chatMember.chatId, chat.id))
    .where(and(eq(chatMember.botId, botId), eq(chat.userId, userId)))
  return rows.map((row) => row.id)
}

export async function insertChat(
  userId: string,
  values: { id: string; botIds: string[]; title: string }
) {
  const { botIds, ...row } = values
  const owned = await db.$count(
    bot,
    and(inArray(bot.id, botIds), eq(bot.userId, userId))
  )
  if (owned !== botIds.length) return false
  await db.transaction(async (tx) => {
    await tx.insert(chat).values({ ...row, userId })
    await tx
      .insert(chatMember)
      .values(
        botIds.map((botId, position) => ({ chatId: row.id, botId, position }))
      )
  })
  return true
}

export async function deleteChat(userId: string, id: string) {
  const rows = await db
    .delete(chat)
    .where(and(eq(chat.id, id), eq(chat.userId, userId)))
    .returning({ id: chat.id })
  return rows.length > 0
}

export async function findChatTeam(chatId: string) {
  const [membersOf, lastBotId] = await Promise.all([
    listMembers([chatId]),
    lastTurnBotId(chatId),
  ])
  return { bots: membersOf(chatId), lastBotId }
}

export async function findTeammate(botId: string) {
  const row = await db.query.bot.findFirst({
    where: eq(bot.id, botId),
    columns: {
      id: true,
      name: true,
      job: true,
      instructions: true,
      modelId: true,
      maxSteps: true,
      taskBudgetUsd: true,
      dailyBudgetUsd: true,
      fullAuto: true,
    },
    with: {
      providerKey: {
        columns: {
          provider: true,
          baseUrl: true,
          sealedKey: true,
          judgeModelId: true,
        },
      },
      toolPolicies: { columns: { tool: true, requiresApproval: true } },
      notes: {
        columns: { id: true, content: true },
        orderBy: (note) => desc(note.updatedAt),
      },
    },
  })
  if (!row) return null
  const { toolPolicies, ...rest } = row
  return { ...rest, askBefore: askBeforeFrom(toolPolicies) }
}

export async function listHops(chatId: string, userMessageId: string) {
  return db
    .select({ fromBotId: handoff.fromBotId, toBotId: handoff.toBotId })
    .from(handoff)
    .where(
      and(
        eq(handoff.chatId, chatId),
        eq(handoff.userMessageId, userMessageId),
        eq(handoff.accepted, true)
      )
    )
    .orderBy(asc(handoff.createdAt))
}

export async function insertHandoff(values: typeof handoff.$inferInsert) {
  const [row] = await db
    .insert(handoff)
    .values(values)
    .returning({ id: handoff.id, createdAt: handoff.createdAt })
  return row
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

export type TurnTotals = {
  stepCount: number
  inputTokens: number
  outputTokens: number
  costUsd: number
}

export async function resumeTurn(chatId: string, answers: ApprovalAnswer[]) {
  return db.transaction(async (tx) => {
    const [open] = await tx
      .select({
        id: turn.id,
        botId: turn.botId,
        stepCount: turn.stepCount,
        inputTokens: turn.inputTokens,
        outputTokens: turn.outputTokens,
        costUsd: turn.costUsd,
      })
      .from(turn)
      .where(and(eq(turn.chatId, chatId), isNull(turn.endedAt)))
      .orderBy(desc(turn.startedAt))
      .limit(1)
      .for("update")
    if (!open) return null
    const decidedAt = new Date()
    const decided: (ApprovalAnswer & { at: number })[] = []
    for (const answer of answers) {
      const call = and(
        eq(approval.turnId, open.id),
        eq(approval.toolCallId, answer.toolCallId)
      )
      const rows = await tx
        .update(approval)
        .set({ status: answer.approved ? "approved" : "denied", decidedAt })
        .where(and(call, eq(approval.status, "pending")))
        .returning({ toolCallId: approval.toolCallId })
      if (rows.length === 0) continue
      decided.push({ ...answer, at: decidedAt.getTime() })
      if (!answer.approved) {
        await tx
          .update(toolCall)
          .set({ status: "denied", finishedAt: decidedAt })
          .where(
            and(
              eq(toolCall.turnId, open.id),
              eq(toolCall.toolCallId, answer.toolCallId)
            )
          )
      }
    }
    if (decided.length === 0) return null
    const { id, botId, ...totals } = open
    return { id, botId, totals, decided }
  })
}

export async function pauseTurn(id: string, totals: TurnTotals) {
  await db.update(turn).set(totals).where(eq(turn.id, id))
}

export async function finishTurn(
  id: string,
  values: TurnTotals & { endReason: TurnEndReason }
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
