import type { LanguageModelV4StreamPart } from "@ai-sdk/provider"
import { mockChatAgent } from "@trigger.dev/sdk/ai/test"
import { simulateReadableStream, type UIMessage } from "ai"
import { MockLanguageModelV4 } from "ai/test"
import { eq } from "drizzle-orm"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { LIMIT_CEILINGS } from "@/lib/bot-schemas"
import type { TeammateMessage } from "@/lib/chat"
import { db } from "@/server/db/client"
import {
  insertChat,
  loadTranscript,
  startTurn,
} from "@/server/db/queries/chats"
import * as schema from "@/server/db/schema"
import { sandboxLease } from "@/server/sandbox/lease"
import { teammateChat } from "./teammate-chat"

const fakes = await vi.hoisted(async () => {
  const { createFakeTurnRuntime } = await import("@/server/fakes/turn-runtime")
  const { createFakeSandboxes } = await import("@/server/fakes/sandbox")
  const { createMemoryLogger } = await import("@/server/fakes/logger")
  const { createFakeTelemetry } = await import("@/server/fakes/telemetry")
  const { LIMIT_CEILINGS } = await import("@/lib/bot-schemas")
  return {
    models: new Map<string, MockLanguageModelV4>(),
    runtime: createFakeTurnRuntime(),
    sandboxes: createFakeSandboxes(),
    logger: createMemoryLogger(),
    telemetry: createFakeTelemetry(),
    caps: { ...LIMIT_CEILINGS },
  }
})

vi.mock("@/server/db/client")
vi.mock("@/server/env", () => ({
  env: {
    NODE_ENV: "test",
    ENCRYPTION_KEY: Buffer.alloc(32, 7).toString("base64"),
    DAYTONA_SNAPSHOT: "ace-desktop",
  },
  teammateCaps: fakes.caps,
}))
vi.mock("@/server/adapters/ai-sdk", async () => {
  const { createFakeModels } = await import("@/server/fakes/models")
  const models = createFakeModels({
    model: (modelId) => {
      const model = fakes.models.get(modelId)
      if (!model) throw new Error(`No model script for ${modelId}.`)
      return model
    },
  })
  return { createAiSdkModels: () => models }
})
vi.mock("@/server/adapters/ai-gateway", async () => {
  const { createFakeModelCatalog } = await import(
    "@/server/fakes/model-catalog"
  )
  const model = (id: string, vision: boolean) => ({
    id,
    label: id,
    vision,
    inputUsdPerMTok: 1,
    outputUsdPerMTok: 5,
  })
  const catalog = createFakeModelCatalog({
    anthropic: [
      model("worker", false),
      model("writer", false),
      model("seer", true),
      model("judge", true),
    ],
  })
  return { createAiGatewayCatalog: () => catalog }
})
vi.mock("@/server/adapters/daytona", () => ({
  createDaytonaSandboxes: () => fakes.sandboxes,
}))
vi.mock("@/server/adapters/pino", () => ({
  createPinoLogger: () => fakes.logger,
}))
vi.mock("@/server/adapters/otel", () => ({
  createOtelTelemetry: () => fakes.telemetry,
}))
vi.mock("@/server/adapters/trigger/turn-runtime", () => ({
  triggerTurnRuntime: fakes.runtime,
}))

const usage = {
  inputTokens: {
    total: 10,
    noCache: 10,
    cacheRead: undefined,
    cacheWrite: undefined,
  },
  outputTokens: { total: 5, text: 5, reasoning: undefined },
}

function textStep(text: string): LanguageModelV4StreamPart[] {
  return [
    { type: "text-start", id: "t" },
    { type: "text-delta", id: "t", delta: text },
    { type: "text-end", id: "t" },
    {
      type: "finish",
      finishReason: { unified: "stop", raw: undefined },
      usage,
    },
  ]
}

function toolStep(
  toolCallId: string,
  toolName: string,
  input: unknown
): LanguageModelV4StreamPart[] {
  return [
    {
      type: "tool-call",
      toolCallId,
      toolName,
      input: JSON.stringify(input),
    },
    {
      type: "finish",
      finishReason: { unified: "tool-calls", raw: undefined },
      usage,
    },
  ]
}

function script(modelId: string, steps: LanguageModelV4StreamPart[][]) {
  const queue = [...steps]
  const model = new MockLanguageModelV4({
    modelId,
    doStream: async () => ({
      stream: simulateReadableStream({
        chunks: queue.shift() ?? textStep("Nothing more to do."),
      }),
    }),
    doGenerate: async () => ({
      content: [{ type: "text", text: '{"critical":false,"reason":""}' }],
      finishReason: { unified: "stop", raw: undefined },
      usage,
      warnings: [],
    }),
  })
  fakes.models.set(modelId, model)
  return model
}

function promptText(model: MockLanguageModelV4, call = 0) {
  return JSON.stringify(model.doStreamCalls[call]?.prompt ?? [])
}

function userMessage(text: string): UIMessage {
  return {
    id: `u-${crypto.randomUUID()}`,
    role: "user",
    parts: [{ type: "text", text }],
  }
}

async function until(check: () => boolean | Promise<boolean>) {
  const deadline = Date.now() + 10_000
  while (!(await check())) {
    if (Date.now() > deadline) throw new Error("Timed out waiting.")
    await new Promise((resolve) => setTimeout(resolve, 10))
  }
}

async function lastReply(chatId: string) {
  const { messages } = await loadTranscript<TeammateMessage>(chatId)
  const reply = messages.findLast((message) => message.role === "assistant")
  if (!reply) throw new Error("No reply was saved.")
  return reply
}

function ended(chatId: string, index: number, endReason: string) {
  return until(
    async () => (await turns(chatId))[index]?.endReason === endReason
  )
}

async function turns(chatId: string) {
  return db
    .select({
      botId: schema.turn.botId,
      endReason: schema.turn.endReason,
      stepCount: schema.turn.stepCount,
    })
    .from(schema.turn)
    .where(eq(schema.turn.chatId, chatId))
    .orderBy(schema.turn.startedAt)
}

type Harness = ReturnType<typeof mockChatAgent>

let harness: Harness | undefined
let keyId: string

function open(chatId: string) {
  harness = mockChatAgent(teammateChat, { chatId })
  return harness
}

async function addBot(name: string, modelId: string, asksBeforeShell = false) {
  const [bot] = await db
    .insert(schema.bot)
    .values({
      userId: "user-1",
      name,
      job: `${name} work`,
      modelId,
      providerKeyId: keyId,
    })
    .returning({ id: schema.bot.id })
  await db.insert(schema.botToolPolicy).values({
    botId: bot.id,
    tool: "shell",
    requiresApproval: asksBeforeShell,
  })
  return bot.id
}

async function addChat(botIds: string[]) {
  const id = crypto.randomUUID()
  await insertChat("user-1", { id, botIds, message: "Q3 vendor spend" })
  return id
}

beforeEach(async () => {
  fakes.models.clear()
  fakes.runtime.waits.clear()
  fakes.runtime.chunks.length = 0
  fakes.runtime.sent.length = 0
  fakes.sandboxes.opened.clear()
  fakes.logger.entries.length = 0
  Object.assign(fakes.caps, LIMIT_CEILINGS)
  script("judge", [])
  await db.delete(schema.user)
  await db.insert(schema.user).values({
    id: "user-1",
    name: "Sam",
    email: "sam@example.com",
  })
  const [key] = await db
    .insert(schema.providerKey)
    .values({ userId: "user-1", provider: "anthropic", judgeModelId: "judge" })
    .returning({ id: schema.providerKey.id })
  keyId = key.id
})

afterEach(async () => {
  await harness?.close()
  harness = undefined
})

describe("a teammate turn", () => {
  it("answers, records the turn and traces the model call", async () => {
    const botId = await addBot("Researcher", "worker")
    const chatId = await addChat([botId])
    script("worker", [textStep("The totals match.")])

    await open(chatId).sendMessage(userMessage("Do the totals match?"))

    await ended(chatId, 0, "done")
    expect(await turns(chatId)).toEqual([
      { botId, endReason: "done", stepCount: 1 },
    ])
    expect((await lastReply(chatId)).parts).toContainEqual(
      expect.objectContaining({ type: "text", text: "The totals match." })
    )
    expect(fakes.telemetry.functionIds).toContain("teammate-turn")
    expect(fakes.logger.entries).toContainEqual(
      expect.objectContaining({
        message: "Turn ended",
        fields: expect.objectContaining({ chatId, botId, endReason: "done" }),
      })
    )
  })
})

describe("limits", () => {
  it("stops at the step cap this Ace sets even when the teammate allows more", async () => {
    const botId = await addBot("Researcher", "worker")
    const chatId = await addChat([botId])
    fakes.caps.maxSteps = 1
    const worker = script("worker", [
      toolStep("call-1", "shell", {
        purpose: "count the rows",
        command: "wc -l data.csv",
      }),
      textStep("There are 12 rows."),
    ])

    await open(chatId).sendMessage(userMessage("How many rows?"))

    await ended(chatId, 0, "step_limit")
    expect(worker.doStreamCalls).toHaveLength(1)
    expect(await turns(chatId)).toEqual([
      { botId, endReason: "step_limit", stepCount: 1 },
    ])
  })
})

describe("approvals", () => {
  async function askedTurn() {
    const botId = await addBot("Researcher", "worker", true)
    const chatId = await addChat([botId])
    const worker = script("worker", [
      toolStep("call-1", "shell", { purpose: "list the files", command: "ls" }),
      textStep("Here are the files."),
    ])
    const chat = open(chatId)
    const turn = await chat.sendMessage(userMessage("What's there?"))
    return { botId, chatId, chat, turn, worker }
  }

  async function answer(chat: Harness, chatId: string, approved: boolean) {
    const reply = await lastReply(chatId)
    const parts = reply.parts.map((part) =>
      "approval" in part && part.state === "approval-requested"
        ? {
            ...part,
            state: "approval-responded" as const,
            approval: { ...part.approval, approved },
          }
        : part
    )
    return chat.sendMessage({ ...reply, parts })
  }

  async function approvalStatus(chatId: string) {
    const [row] = await db
      .select({ status: schema.approval.status })
      .from(schema.approval)
      .innerJoin(schema.turn, eq(schema.turn.id, schema.approval.turnId))
      .where(eq(schema.turn.chatId, chatId))
    return row?.status
  }

  it("waits for your answer before running, then runs once you allow it", async () => {
    const { botId, chatId, chat, turn } = await askedTurn()

    expect(turn.chunks).toContainEqual(
      expect.objectContaining({ type: "tool-approval-request" })
    )
    expect(await approvalStatus(chatId)).toBe("pending")
    expect(fakes.sandboxes.opened.size).toBe(0)

    await answer(chat, chatId, true)

    await ended(chatId, 0, "done")
    expect(fakes.sandboxes.opened.get(botId)?.commands).toEqual(["ls"])
    expect(await approvalStatus(chatId)).toBe("approved")
    expect((await lastReply(chatId)).parts).toContainEqual(
      expect.objectContaining({ type: "text", text: "Here are the files." })
    )
  })

  it("never runs what you didn't allow and tells the teammate", async () => {
    const { chatId, chat, worker } = await askedTurn()

    await answer(chat, chatId, false)

    await ended(chatId, 0, "done")
    expect(fakes.sandboxes.opened.size).toBe(0)
    expect(await approvalStatus(chatId)).toBe("denied")
    const [call] = await db
      .select({ status: schema.toolCall.status })
      .from(schema.toolCall)
    expect(call.status).toBe("denied")
    expect(promptText(worker, 1)).toContain("execution-denied")
  })
})

describe("take control", () => {
  it("waits while you are in control, then looks at the screen again", async () => {
    const botId = await addBot("Researcher", "seer")
    const chatId = await addChat([botId])
    const seer = script("seer", [textStep("I see the new page.")])
    const waitRef = await fakes.runtime.createWait(600)
    await db.insert(schema.sandbox).values({
      botId,
      control: "user",
      controlChatId: chatId,
      controlSince: new Date(),
      takeoverWaitRef: waitRef,
    })

    const reply = open(chatId).sendMessage(userMessage("Carry on"))
    await until(() =>
      fakes.runtime.chunks.some((chunk) => chunk.type === "data-control")
    )
    expect(seer.doStreamCalls).toHaveLength(0)

    await fakes.runtime.completeWait(waitRef)
    await reply

    expect(promptText(seer)).toContain("has now given it back")
    expect(promptText(seer)).toContain("image/jpeg")
    const [row] = await db
      .select({ control: schema.sandbox.control })
      .from(schema.sandbox)
      .where(eq(schema.sandbox.botId, botId))
    expect(row.control).toBe("bot")
    expect(
      fakes.runtime.chunks.filter((chunk) => chunk.type === "data-control")
    ).toEqual([
      expect.objectContaining({ data: { tookAt: expect.any(Number) } }),
      expect.objectContaining({
        data: { tookAt: expect.any(Number), gaveAt: expect.any(Number) },
      }),
    ])
  })

  it("records control you took while it was idle without starting a turn", async () => {
    const botId = await addBot("Researcher", "seer")
    const chatId = await addChat([botId])
    const seer = script("seer", [])
    const messageId = crypto.randomUUID()
    const control = { tookAt: 1, gaveAt: 2, botId }

    await open(chatId).sendAction({
      type: "gave-back-control",
      messageId,
      control,
    })

    await until(async () => (await loadTranscript(chatId)).messages.length > 0)
    const { messages } = await loadTranscript<TeammateMessage>(chatId)
    expect(messages).toEqual([
      expect.objectContaining({
        id: messageId,
        role: "user",
        metadata: { createdAt: 2, control },
      }),
    ])
    expect(await turns(chatId)).toEqual([])
    expect(seer.doStreamCalls).toHaveLength(0)
  })
})

describe("crash retry", () => {
  it("closes the dead turn and tells the teammate what it did", async () => {
    const botId = await addBot("Researcher", "worker")
    const chatId = await addChat([botId])
    const dead = await startTurn(chatId, botId)
    await db.insert(schema.toolCall).values({
      turnId: dead.id,
      toolCallId: "call-dead",
      toolName: "shell",
      input: { command: "make report" },
      risk: "normal",
    })
    const worker = script("worker", [textStep("I checked first.")])

    await open(chatId).sendMessage(userMessage("Are you done?"))

    expect(promptText(worker)).toContain("stopped unexpectedly")
    expect(promptText(worker)).toContain("make report")
    const [call] = await db
      .select({ status: schema.toolCall.status })
      .from(schema.toolCall)
      .where(eq(schema.toolCall.turnId, dead.id))
    expect(call.status).toBe("interrupted")
    await ended(chatId, 1, "done")
    expect((await turns(chatId))[0].endReason).toBe("error")
  })
})

describe("group chat handoffs", () => {
  it("passes the task on, and the guard stops it coming straight back", async () => {
    const researcher = await addBot("Researcher", "worker")
    const writer = await addBot("Writer", "writer")
    const chatId = await addChat([researcher, writer])
    script("worker", [
      toolStep("call-pass", "handoff", {
        toBotId: writer,
        summary: "Spend is up 12 percent.",
        nextStep: "Write the summary.",
      }),
    ])
    const writerModel = script("writer", [
      toolStep("call-back", "handoff", {
        toBotId: researcher,
        summary: "Done nothing yet.",
        nextStep: "Check again.",
      }),
      textStep("Draft ready."),
    ])
    const chat = open(chatId)

    await chat.sendMessage(userMessage("Report on Q3 spend"))
    await until(() => fakes.runtime.sent.length === 1)
    const [passed] = fakes.runtime.sent
    expect(passed.chatId).toBe(chatId)

    await chat.sendMessage(passed.message)
    await ended(chatId, 1, "done")

    expect(promptText(writerModel)).toContain("Spend is up 12 percent.")
    expect(await turns(chatId)).toEqual([
      { botId: researcher, endReason: "handoff", stepCount: 1 },
      { botId: writer, endReason: "done", stepCount: 2 },
    ])
    expect(
      await db
        .select({
          toBotId: schema.handoff.toBotId,
          accepted: schema.handoff.accepted,
        })
        .from(schema.handoff)
        .where(eq(schema.handoff.chatId, chatId))
        .orderBy(schema.handoff.createdAt)
    ).toEqual([
      { toBotId: writer, accepted: true },
      { toBotId: researcher, accepted: false },
    ])
    expect(fakes.runtime.sent).toHaveLength(1)
  })
})

describe("one task at a time", () => {
  it("queues behind the teammate's other chat and starts when it ends", async () => {
    const botId = await addBot("Researcher", "worker")
    const busyChat = await addChat([botId])
    const chatId = await addChat([botId])
    const busy = await startTurn(busyChat, botId)
    const other = sandboxLease({
      botId,
      turnId: busy.id,
      runtime: fakes.runtime,
      onQueued: () => {},
      onStarted: () => {},
    })
    await other.ensure()
    const worker = script("worker", [textStep("On it.")])

    const reply = open(chatId).sendMessage(userMessage("Next task"))
    await until(() =>
      fakes.runtime.chunks.some((chunk) => chunk.type === "data-queue")
    )
    expect(worker.doStreamCalls).toHaveLength(0)

    await other.release()
    await reply

    expect(worker.doStreamCalls).toHaveLength(1)
    expect(
      fakes.runtime.chunks.filter((chunk) => chunk.type === "data-queue")
    ).toEqual([
      expect.objectContaining({
        data: { chatId: busyChat, title: "Q3 vendor spend", waitingOn: "work" },
      }),
      expect.objectContaining({
        data: expect.objectContaining({ startedAt: expect.any(Number) }),
      }),
    ])
    const [lease] = await db
      .select({ leaseTurnId: schema.sandbox.leaseTurnId })
      .from(schema.sandbox)
      .where(eq(schema.sandbox.botId, botId))
    expect(lease.leaseTurnId).toBeNull()
  })
})
