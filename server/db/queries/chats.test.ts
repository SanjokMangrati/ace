import type { UIMessage } from "ai"
import { eq } from "drizzle-orm"
import { beforeAll, describe, expect, it, vi } from "vitest"
import { db } from "@/server/db/client"
import * as schema from "@/server/db/schema"
import {
  endRunningTurns,
  findChat,
  findChatBotIds,
  findChatTeam,
  findTeammate,
  insertChat,
  insertHandoff,
  listChats,
  listHops,
  loadTranscript,
  pauseTurn,
  resumeTurn,
  saveTranscript,
  setChatModel,
  startTurn,
} from "./chats"
import { askApproval, toolCallLedger } from "./tool-calls"

vi.mock("@/server/db/client")

const normal = () => "normal" as const

const chatId = "00000000-0000-4000-8000-000000000001"
let botId: string

function text(id: string, role: UIMessage["role"] = "user"): UIMessage {
  return { id, role, parts: [{ type: "text", text: id }] }
}

async function ids(opts?: { limit?: number; before?: string }) {
  const { messages } = await loadTranscript(chatId, opts)
  return messages.map((message) => message.id)
}

beforeAll(async () => {
  await db.insert(schema.user).values({
    id: "user-1",
    name: "Sam",
    email: "sam@example.com",
  })
  const [bot] = await db
    .insert(schema.bot)
    .values({
      userId: "user-1",
      name: "Researcher",
      job: "Finds things",
      modelId: "m",
    })
    .returning({ id: schema.bot.id })
  botId = bot.id
  await insertChat("user-1", { id: chatId, botIds: [botId], message: "Hi" })
})

describe("transcript storage", () => {
  it("appends new ids in order and replaces known ids in place", async () => {
    await saveTranscript(
      chatId,
      [
        { op: "put", message: text("a") },
        { op: "put", message: text("b", "assistant"), final: false },
      ],
      { lastOutEventId: "1" }
    )
    await saveTranscript(
      chatId,
      [
        { op: "put", message: text("c") },
        { op: "put", message: { ...text("b", "assistant"), parts: [] } },
      ],
      undefined
    )

    const result = await loadTranscript(chatId)
    expect(result.messages.map((message) => message.id)).toEqual([
      "a",
      "b",
      "c",
    ])
    expect(result.messages[1].parts).toEqual([])
    expect(result.nonFinalIds).toEqual([])
    expect(result.cursors).toEqual({ lastOutEventId: "1" })
  })

  it("pages from the newest message backwards", async () => {
    expect(await ids({ limit: 2 })).toEqual(["b", "c"])
    const page = await loadTranscript(chatId, { limit: 2 })
    expect(page.nextCursor).toBe("b")
    expect(await ids({ limit: 2, before: "b" })).toEqual(["a"])
  })

  it("truncates, removes and stores state idempotently", async () => {
    const changes = [
      { op: "truncateAfter", afterId: "a" },
      { op: "remove", id: "missing" },
      { op: "state", value: { summary: "s" } },
    ] as const
    await saveTranscript(chatId, changes, undefined)
    await saveTranscript(chatId, changes, undefined)

    const result = await loadTranscript(chatId)
    expect(result.messages.map((message) => message.id)).toEqual(["a"])
    expect(result.state).toEqual({ summary: "s" })
  })
})

describe("tool call ledger", () => {
  async function statuses(turnId: string) {
    const rows = await db
      .select({
        id: schema.toolCall.toolCallId,
        status: schema.toolCall.status,
      })
      .from(schema.toolCall)
      .where(eq(schema.toolCall.turnId, turnId))
      .orderBy(schema.toolCall.startedAt)
    return rows.map((row) => `${row.id} ${row.status}`)
  }

  it("marks unfinished calls of a dead turn interrupted and reports them to the next turn", async () => {
    const dead = await startTurn(chatId, botId)
    expect(dead.interrupted).toEqual([])
    const ledger = toolCallLedger(dead.id, normal)
    await ledger.start({
      toolCallId: "a",
      toolName: "shell",
      input: { command: "ls" },
    })
    await ledger.finish("a", { exitCode: 0 })
    await ledger.start({
      toolCallId: "b",
      toolName: "fs_write",
      input: { path: "x" },
    })
    await ledger.fail("b", "Disk full.")
    await ledger.start({ toolCallId: "c", toolName: "computer", input: {} })

    const next = await startTurn(chatId, botId)

    expect(await statuses(dead.id)).toEqual([
      "a finished",
      "b failed",
      "c interrupted",
    ])
    expect(next.interrupted).toEqual([
      { toolName: "shell", input: { command: "ls" }, status: "finished" },
      { toolName: "fs_write", input: { path: "x" }, status: "failed" },
      { toolName: "computer", input: {}, status: "interrupted" },
    ])
    expect((await startTurn(chatId, botId)).interrupted).toEqual([])
  })

  it("reports nothing after a turn whose calls all finished", async () => {
    const done = await startTurn(chatId, botId)
    await toolCallLedger(done.id, normal).start({
      toolCallId: "a",
      toolName: "shell",
      input: {},
    })
    await toolCallLedger(done.id, normal).finish("a", {})

    expect((await startTurn(chatId, botId)).interrupted).toEqual([])
  })

  it("marks unfinished calls interrupted when a failed run ends its turns", async () => {
    const dead = await startTurn(chatId, botId)
    await toolCallLedger(dead.id, normal).start({
      toolCallId: "a",
      toolName: "shell",
      input: {},
    })

    expect(await endRunningTurns(chatId)).toEqual([{ id: dead.id, botId }])
    expect(await statuses(dead.id)).toEqual(["a interrupted"])
    expect((await startTurn(chatId, botId)).interrupted).toEqual([
      { toolName: "shell", input: {}, status: "interrupted" },
    ])
  })
})

describe("approvals", () => {
  async function ask(turnId: string, toolCallId: string) {
    await askApproval(turnId, {
      toolCallId,
      toolName: "shell",
      input: { command: "git push" },
      risk: "normal",
      reason: "policy",
    })
  }

  async function status() {
    const [row] = await listChats("user-1")
    return { working: row.working, needsYou: row.needsYou }
  }

  it("keeps a waiting turn open, shows it as needing you, and resumes it with the answers", async () => {
    const waiting = await startTurn(chatId, botId)
    await ask(waiting.id, "a")
    await ask(waiting.id, "b")
    await pauseTurn(waiting.id, {
      stepCount: 3,
      inputTokens: 10,
      outputTokens: 5,
      costUsd: 0.5,
    })
    expect(await status()).toEqual({ working: false, needsYou: true })

    const resumed = await resumeTurn(chatId, [
      { toolCallId: "a", approved: true },
      { toolCallId: "b", approved: false },
    ])

    expect(resumed?.id).toBe(waiting.id)
    expect(resumed?.totals).toEqual({
      stepCount: 3,
      inputTokens: 10,
      outputTokens: 5,
      costUsd: 0.5,
    })
    expect(
      resumed?.decided.map(({ toolCallId, approved }) => [toolCallId, approved])
    ).toEqual([
      ["a", true],
      ["b", false],
    ])
    expect(await status()).toEqual({ working: true, needsYou: false })

    const ledger = toolCallLedger(waiting.id, () => undefined)
    await ledger.start({ toolCallId: "a", toolName: "shell", input: {} })
    await expect(
      ledger.start({ toolCallId: "a", toolName: "shell", input: {} })
    ).rejects.toThrow("already ran")
    await expect(
      ledger.start({ toolCallId: "b", toolName: "shell", input: {} })
    ).rejects.toThrow("already ran")
  })

  it("doesn't resume a turn for answers it never asked for or already has", async () => {
    const waiting = await startTurn(chatId, botId)
    await ask(waiting.id, "a")
    expect(
      await resumeTurn(chatId, [{ toolCallId: "z", approved: true }])
    ).toBeNull()
    expect(
      await resumeTurn(chatId, [{ toolCallId: "a", approved: true }])
    ).not.toBeNull()
    expect(
      await resumeTurn(chatId, [{ toolCallId: "a", approved: true }])
    ).toBeNull()
  })
})

describe("group chats", () => {
  const groupId = "00000000-0000-4000-8000-000000000002"
  let writerId: string

  beforeAll(async () => {
    const [writer] = await db
      .insert(schema.bot)
      .values({ userId: "user-1", name: "Writer", job: "Drafts", modelId: "m" })
      .returning({ id: schema.bot.id })
    writerId = writer.id
  })

  it("only adds teammates you own, in the order you picked them", async () => {
    expect(
      await insertChat("user-2", {
        id: groupId,
        botIds: [botId],
        message: "Offsite",
      })
    ).toBe(false)
    expect(
      await insertChat("user-1", {
        id: groupId,
        botIds: [writerId, botId],
        message: "Offsite",
      })
    ).toBe(true)
    const team = await findChatTeam(groupId)
    expect(team.bots.map((bot) => bot.name)).toEqual(["Writer", "Researcher"])
    expect(await findChatBotIds("user-1", groupId)).toEqual([writerId, botId])
    expect(await findChatBotIds("user-2", groupId)).toEqual([])
  })

  it("remembers who worked last and the accepted hops since your message", async () => {
    await startTurn(groupId, botId)
    expect((await findChatTeam(groupId)).lastBotId).toBe(botId)

    const hop = {
      chatId: groupId,
      userMessageId: "u1",
      summary: "Done",
      nextStep: "Next",
    }
    await insertHandoff({
      ...hop,
      fromBotId: botId,
      toBotId: writerId,
      accepted: true,
    })
    await insertHandoff({
      ...hop,
      fromBotId: writerId,
      toBotId: botId,
      accepted: false,
      rejectReason: "back",
    })
    await insertHandoff({
      ...hop,
      userMessageId: "u0",
      fromBotId: writerId,
      toBotId: botId,
      accepted: true,
    })
    expect(await listHops(groupId, "u1")).toEqual([
      { fromBotId: botId, toBotId: writerId },
    ])
  })
})

describe("chat model", () => {
  let defaultKeyId: string
  let otherKeyId: string

  beforeAll(async () => {
    const [defaultKey, otherKey] = await db
      .insert(schema.providerKey)
      .values([
        { userId: "user-1", provider: "anthropic" },
        { userId: "user-1", provider: "openai" },
      ])
      .returning({ id: schema.providerKey.id })
    defaultKeyId = defaultKey.id
    otherKeyId = otherKey.id
    await db
      .update(schema.bot)
      .set({ providerKeyId: defaultKeyId })
      .where(eq(schema.bot.id, botId))
  })

  async function used() {
    const teammate = await findTeammate(chatId, botId)
    const chat = await findChat("user-1", chatId)
    return {
      provider: teammate?.providerKey?.provider,
      modelId: teammate?.modelId,
      shown: chat?.bots[0].model,
    }
  }

  it("uses the teammate's model until you pick another for this chat", async () => {
    expect(await used()).toEqual({
      provider: "anthropic",
      modelId: "m",
      shown: {
        providerKeyId: defaultKeyId,
        modelId: "m",
        defaultProviderKeyId: defaultKeyId,
        defaultModelId: "m",
      },
    })

    await setChatModel(chatId, botId, {
      providerKeyId: otherKeyId,
      modelId: "gpt",
    })
    expect(await used()).toMatchObject({
      provider: "openai",
      modelId: "gpt",
      shown: { providerKeyId: otherKeyId, modelId: "gpt" },
    })
  })

  it("follows the teammate again when you pick its own model", async () => {
    await setChatModel(chatId, botId, {
      providerKeyId: defaultKeyId,
      modelId: "m",
    })
    const [member] = await db
      .select({
        providerKeyId: schema.chatMember.providerKeyId,
        modelId: schema.chatMember.modelId,
      })
      .from(schema.chatMember)
      .where(eq(schema.chatMember.chatId, chatId))
    expect(member).toEqual({ providerKeyId: null, modelId: null })
  })

  it("keeps the model you picked when you start a chat", async () => {
    const startedId = "00000000-0000-4000-8000-000000000003"
    await insertChat("user-1", {
      id: startedId,
      botIds: [botId],
      message: "Picked",
      models: { [botId]: { providerKeyId: otherKeyId, modelId: "gpt" } },
    })
    const teammate = await findTeammate(startedId, botId)
    expect(teammate?.providerKey?.provider).toBe("openai")
    expect(teammate?.modelId).toBe("gpt")
  })

  it("falls back to the teammate's model when the chat's AI provider is deleted", async () => {
    await setChatModel(chatId, botId, {
      providerKeyId: otherKeyId,
      modelId: "gpt",
    })
    await db
      .delete(schema.providerKey)
      .where(eq(schema.providerKey.id, otherKeyId))
    expect(await used()).toMatchObject({
      provider: "anthropic",
      modelId: "m",
      shown: { providerKeyId: defaultKeyId, modelId: "m" },
    })
  })
})
