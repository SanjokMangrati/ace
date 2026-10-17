import { PGlite } from "@electric-sql/pglite"
import { pushSchema } from "drizzle-kit/api"
import { eq } from "drizzle-orm"
import { drizzle } from "drizzle-orm/pglite"
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest"
import type { LeaseHolder } from "@/server/db/queries/sandboxes"
import * as schema from "@/server/db/schema"

const db = drizzle({ client: new PGlite(), schema })

vi.mock("server-only", () => ({}))
vi.mock("@/server/db/client", () => ({ db }))

const { sandboxLease } = await import("./lease")

let botId: string
let chatIds: string[]

function fakeRuntime() {
  const waits = new Map<string, () => void>()
  const pending = new Map<string, Promise<void>>()
  const timeouts: number[] = []
  return {
    timeouts,
    expire: (ref: string) => waits.get(ref)?.(),
    refs: () => [...waits.keys()],
    createWait: async (timeoutSec: number) => {
      const ref = `wait-${timeouts.push(timeoutSec)}`
      pending.set(ref, new Promise((resolve) => waits.set(ref, resolve)))
      return ref
    },
    completeWait: async (ref: string) => waits.get(ref)?.(),
    waitFor: async (ref: string) => pending.get(ref),
  }
}

async function startTurn(chatIndex: number, runtime = fakeRuntime()) {
  const [row] = await db
    .insert(schema.turn)
    .values({ chatId: chatIds[chatIndex], botId })
    .returning({ id: schema.turn.id })
  const queued: LeaseHolder[] = []
  const started: LeaseHolder[] = []
  const lease = sandboxLease({
    botId,
    turnId: row.id,
    runtime,
    onQueued: (holder) => queued.push(holder),
    onStarted: (holder) => started.push(holder),
  })
  return { lease, queued, started, runtime }
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
  chatIds = [1, 2, 3].map((n) => `00000000-0000-4000-8000-00000000000${n}`)
  await db.insert(schema.chat).values(
    chatIds.map((id, index) => ({
      id,
      userId: "user-1",
      botId,
      title: `Chat ${index + 1}`,
    }))
  )
})

beforeEach(async () => {
  await db.delete(schema.sandbox)
  await db.delete(schema.turn)
})

describe("sandboxLease", () => {
  it("starts right away when the teammate is free", async () => {
    const first = await startTurn(0)
    await first.lease.ensure()
    expect(first.queued).toEqual([])
    expect(first.started).toEqual([])
    await first.lease.release()
  })

  it("waits for the running turn and starts when it releases", async () => {
    const runtime = fakeRuntime()
    const first = await startTurn(0, runtime)
    const second = await startTurn(1, runtime)
    await first.lease.ensure()

    let started = false
    const waiting = second.lease.ensure().then(() => {
      started = true
    })
    await vi.waitFor(() => expect(second.queued).toHaveLength(1))
    expect(second.queued[0]).toEqual({
      chatId: chatIds[0],
      title: "Chat 1",
      waitingOn: "work",
    })
    expect(started).toBe(false)

    await first.lease.release()
    await waiting
    expect(second.started).toEqual([second.queued[0]])
    await second.lease.release()
  })

  it("runs queued turns in the order they arrived", async () => {
    const runtime = fakeRuntime()
    const first = await startTurn(0, runtime)
    const second = await startTurn(1, runtime)
    const third = await startTurn(2, runtime)
    await first.lease.ensure()

    const order: string[] = []
    const secondDone = second.lease.ensure().then(() => order.push("second"))
    await vi.waitFor(() => expect(second.queued).toHaveLength(1))
    const thirdDone = third.lease.ensure().then(() => order.push("third"))
    await vi.waitFor(() => expect(third.queued).toHaveLength(1))

    await first.lease.release()
    await secondDone
    expect(order).toEqual(["second"])
    await vi.waitFor(() => expect(third.queued).toHaveLength(2))
    expect(third.queued[1].chatId).toBe(chatIds[1])

    await second.lease.release()
    await thirdDone
    expect(order).toEqual(["second", "third"])
    await third.lease.release()
  })

  it("tells waiters when the running turn waits for you", async () => {
    const runtime = fakeRuntime()
    const first = await startTurn(0, runtime)
    const second = await startTurn(1, runtime)
    await first.lease.ensure()
    const waiting = second.lease.ensure()
    await vi.waitFor(() => expect(second.queued).toHaveLength(1))

    await db
      .update(schema.sandbox)
      .set({ control: "user" })
      .where(eq(schema.sandbox.botId, botId))
    await first.lease.park(new Date(Date.now() + 60 * 60_000))
    await vi.waitFor(() => expect(second.queued).toHaveLength(2))
    expect(second.queued[1].waitingOn).toBe("you")
    expect(runtime.timeouts.at(-1)).toBeGreaterThan(60 * 60)

    await db
      .update(schema.sandbox)
      .set({ control: "bot" })
      .where(eq(schema.sandbox.botId, botId))
    await first.lease.unpark()
    await vi.waitFor(() => expect(second.queued).toHaveLength(3))
    expect(second.queued[2].waitingOn).toBe("work")

    await first.lease.release()
    await waiting
    await second.lease.release()
  })

  it("takes over a lease whose holder stopped renewing", async () => {
    const runtime = fakeRuntime()
    const first = await startTurn(0, runtime)
    const second = await startTurn(1, runtime)
    await first.lease.ensure()
    const waiting = second.lease.ensure()
    await vi.waitFor(() => expect(second.queued).toHaveLength(1))

    await db
      .update(schema.sandbox)
      .set({ leaseExpiresAt: new Date(Date.now() - 1000) })
      .where(eq(schema.sandbox.botId, botId))
    runtime.expire(runtime.refs()[0])
    await waiting
    expect(second.started).toHaveLength(1)

    await first.lease.release()
    const [row] = await db
      .select({ leaseTurnId: schema.sandbox.leaseTurnId })
      .from(schema.sandbox)
    expect(row.leaseTurnId).not.toBeNull()
    await second.lease.release()
  })
})
