import { PGlite } from "@electric-sql/pglite"
import type { UIMessage } from "ai"
import { pushSchema } from "drizzle-kit/api"
import { eq } from "drizzle-orm"
import { drizzle } from "drizzle-orm/pglite"
import { beforeAll, describe, expect, it, vi } from "vitest"
import * as schema from "@/server/db/schema"

const db = drizzle({ client: new PGlite(), schema })

vi.mock("server-only", () => ({}))
vi.mock("@/server/db/client", () => ({ db }))

const { endRunningTurns, loadTranscript, saveTranscript, startTurn } =
  await import("./chats")
const { toolCallLedger } = await import("./tool-calls")

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
  const { apply } = await pushSchema(schema, db as never)
  await apply()
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
  await db
    .insert(schema.chat)
    .values({ id: chatId, userId: "user-1", botId, title: "Hi" })
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
    const ledger = toolCallLedger(dead.id)
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
    await toolCallLedger(done.id).start({
      toolCallId: "a",
      toolName: "shell",
      input: {},
    })
    await toolCallLedger(done.id).finish("a", {})

    expect((await startTurn(chatId, botId)).interrupted).toEqual([])
  })

  it("marks unfinished calls interrupted when a failed run ends its turns", async () => {
    const dead = await startTurn(chatId, botId)
    await toolCallLedger(dead.id).start({
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
