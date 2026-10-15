import "server-only"
import { and, asc, desc, eq, exists, isNotNull, isNull, sql } from "drizzle-orm"
import {
  type BotFormInput,
  DEFAULT_ASK_BEFORE,
  TOOL_GROUPS,
  type ToolGroup,
} from "@/lib/bot-schemas"
import { type Db, db } from "@/server/db/client"
import {
  insertProviderKey,
  type NewProviderKey,
} from "@/server/db/queries/provider-keys"
import { bot, botToolPolicy, note, turn } from "@/server/db/schema"

export type BotPicture = { data: Buffer; type: string }

export type BotInput = Omit<BotFormInput, "providerKeyId">

export type BotKey = { id: string } | { create: NewProviderKey }

async function resolveKeyId(
  executor: Pick<Db, "insert">,
  userId: string,
  key: BotKey
) {
  if ("id" in key) return key.id
  const row = await insertProviderKey({ ...key.create, userId }, executor)
  return row.id
}

const hasPicture = isNotNull(bot.picture)

export async function listBots(userId: string) {
  return db
    .select({
      id: bot.id,
      name: bot.name,
      job: bot.job,
      hasPicture: sql<boolean>`${hasPicture}`,
      updatedAt: bot.updatedAt,
      working: sql<boolean>`${exists(
        db
          .select({ id: turn.id })
          .from(turn)
          .where(and(eq(turn.botId, bot.id), isNull(turn.endedAt)))
      )}`,
    })
    .from(bot)
    .where(eq(bot.userId, userId))
    .orderBy(asc(bot.createdAt))
}

export function countBots(userId: string) {
  return db.$count(bot, eq(bot.userId, userId))
}

export async function findBot(userId: string, id: string) {
  const row = await db.query.bot.findFirst({
    where: and(eq(bot.id, id), eq(bot.userId, userId)),
    columns: {
      id: true,
      name: true,
      job: true,
      instructions: true,
      providerKeyId: true,
      modelId: true,
      fullAuto: true,
      maxSteps: true,
      taskBudgetUsd: true,
      dailyBudgetUsd: true,
      updatedAt: true,
    },
    extras: { hasPicture: sql<boolean>`${hasPicture}`.as("has_picture") },
    with: {
      toolPolicies: { columns: { tool: true, requiresApproval: true } },
      notes: {
        columns: { id: true, content: true, updatedAt: true },
        orderBy: desc(note.updatedAt),
      },
    },
  })
  if (!row) return null
  const { toolPolicies, ...rest } = row
  const askBefore = { ...DEFAULT_ASK_BEFORE }
  for (const policy of toolPolicies) {
    askBefore[policy.tool] = policy.requiresApproval
  }
  return { ...rest, askBefore }
}

export async function findBotPicture(userId: string, id: string) {
  const [row] = await db
    .select({ data: bot.picture, type: bot.pictureType })
    .from(bot)
    .where(and(eq(bot.id, id), eq(bot.userId, userId), hasPicture))
  return row?.data && row.type ? { data: row.data, type: row.type } : null
}

function columnsFrom(input: BotInput) {
  const { askBefore: _askBefore, ...columns } = input
  return columns
}

function policyRows(botId: string, askBefore: Record<ToolGroup, boolean>) {
  return TOOL_GROUPS.map((tool) => ({
    botId,
    tool,
    requiresApproval: askBefore[tool],
  }))
}

export async function insertBot(
  userId: string,
  id: string,
  input: BotInput,
  key: BotKey,
  picture: BotPicture | null
) {
  await db.transaction(async (tx) => {
    await tx.insert(bot).values({
      ...columnsFrom(input),
      providerKeyId: await resolveKeyId(tx, userId, key),
      id,
      userId,
      picture: picture?.data ?? null,
      pictureType: picture?.type ?? null,
    })
    await tx.insert(botToolPolicy).values(policyRows(id, input.askBefore))
  })
}

export async function updateBot(
  userId: string,
  id: string,
  input: BotInput,
  key: BotKey,
  picture: BotPicture | null | undefined
) {
  return db.transaction(async (tx) => {
    const exists = await tx
      .select({ id: bot.id })
      .from(bot)
      .where(and(eq(bot.id, id), eq(bot.userId, userId)))
    if (exists.length === 0) return false
    await tx
      .update(bot)
      .set({
        ...columnsFrom(input),
        providerKeyId: await resolveKeyId(tx, userId, key),
        ...(picture !== undefined && {
          picture: picture?.data ?? null,
          pictureType: picture?.type ?? null,
        }),
      })
      .where(and(eq(bot.id, id), eq(bot.userId, userId)))
    await tx
      .insert(botToolPolicy)
      .values(policyRows(id, input.askBefore))
      .onConflictDoUpdate({
        target: [botToolPolicy.botId, botToolPolicy.tool],
        set: { requiresApproval: sql`excluded.requires_approval` },
      })
    return true
  })
}

export async function deleteBot(userId: string, id: string) {
  const rows = await db
    .delete(bot)
    .where(and(eq(bot.id, id), eq(bot.userId, userId)))
    .returning({ id: bot.id })
  return rows.length > 0
}
