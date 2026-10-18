import "server-only"
import { and, asc, desc, eq, inArray, isNotNull, sql } from "drizzle-orm"
import {
  askBeforeFrom,
  type BotFormInput,
  TOOL_GROUPS,
  type ToolGroup,
} from "@/lib/bot-schemas"
import { blobKeys } from "@/server/blob-keys"
import { type Db, db } from "@/server/db/client"
import { openTurnStatus } from "@/server/db/queries/chats"
import {
  insertProviderKey,
  type NewProviderKey,
} from "@/server/db/queries/provider-keys"
import {
  bot,
  botToolPolicy,
  chat,
  chatMember,
  note,
  turn,
} from "@/server/db/schema"
import type { BlobStore, StoredBlob } from "@/server/ports/blob-store"

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

const hasPicture = isNotNull(bot.pictureKey)

export async function listBots(userId: string) {
  return db
    .select({
      id: bot.id,
      name: bot.name,
      job: bot.job,
      hasPicture: sql<boolean>`${hasPicture}`,
      updatedAt: bot.updatedAt,
      ...openTurnStatus(eq(turn.botId, bot.id)),
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
  return { ...rest, askBefore: askBeforeFrom(toolPolicies) }
}

export async function findBotPicture(
  blobs: BlobStore,
  userId: string,
  id: string
) {
  const [row] = await db
    .select({ key: bot.pictureKey })
    .from(bot)
    .where(and(eq(bot.id, id), eq(bot.userId, userId)))
  return row?.key ? blobs.get(row.key) : null
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
  blobs: BlobStore,
  userId: string,
  id: string,
  input: BotInput,
  key: BotKey,
  picture: StoredBlob | null
) {
  await db.transaction(async (tx) => {
    await tx.insert(bot).values({
      ...columnsFrom(input),
      providerKeyId: await resolveKeyId(tx, userId, key),
      id,
      userId,
      pictureKey: picture && blobKeys.picture(id),
    })
    await tx.insert(botToolPolicy).values(policyRows(id, input.askBefore))
  })
  if (picture) await blobs.put(blobKeys.picture(id), picture)
}

export async function updateBot(
  blobs: BlobStore,
  userId: string,
  id: string,
  input: BotInput,
  key: BotKey,
  picture: StoredBlob | null | undefined
) {
  const updated = await db.transaction(async (tx) => {
    const [owned] = await tx
      .select({ id: bot.id })
      .from(bot)
      .where(and(eq(bot.id, id), eq(bot.userId, userId)))
    if (!owned) return false
    await tx
      .update(bot)
      .set({
        ...columnsFrom(input),
        providerKeyId: await resolveKeyId(tx, userId, key),
        ...(picture !== undefined && {
          pictureKey: picture && blobKeys.picture(id),
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
  if (updated && picture) await blobs.put(blobKeys.picture(id), picture)
  if (updated && picture === null) await blobs.delete([blobKeys.picture(id)])
  return updated
}

export async function deleteBot(blobs: BlobStore, userId: string, id: string) {
  const deleted = await db.transaction(async (tx) => {
    const chats = await tx
      .delete(chat)
      .where(
        and(
          eq(chat.userId, userId),
          inArray(
            chat.id,
            tx
              .select({ chatId: chatMember.chatId })
              .from(chatMember)
              .where(eq(chatMember.botId, id))
          )
        )
      )
      .returning({ id: chat.id })
    const rows = await tx
      .delete(bot)
      .where(and(eq(bot.id, id), eq(bot.userId, userId)))
      .returning({ id: bot.id })
    return rows.length > 0 ? chats : null
  })
  if (!deleted) return false
  await Promise.all([
    blobs.deletePrefix(blobKeys.teammate(id)),
    ...deleted.map((row) => blobs.deletePrefix(blobKeys.chat(row.id))),
  ])
  return true
}
