import { PGlite } from "@electric-sql/pglite"
import type { UIMessage } from "ai"
import { pushSchema } from "drizzle-kit/api"
import { drizzle } from "drizzle-orm/pglite"
import { beforeAll, describe, expect, it, vi } from "vitest"
import * as schema from "@/server/db/schema"

const db = drizzle({ client: new PGlite(), schema })

vi.mock("server-only", () => ({}))
vi.mock("@/server/db/client", () => ({ db }))

const { loadTranscript, saveTranscript } = await import("./chats")

const chatId = "00000000-0000-4000-8000-000000000001"

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
  await db
    .insert(schema.chat)
    .values({ id: chatId, userId: "user-1", botId: bot.id, title: "Hi" })
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
