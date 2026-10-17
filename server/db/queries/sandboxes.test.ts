import { eq } from "drizzle-orm"
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest"
import { db } from "@/server/db/client"
import * as schema from "@/server/db/schema"
import {
  claimLease,
  listWaiterRefs,
  releaseLease,
  renewLease,
} from "./sandboxes"

vi.mock("@/server/db/client")

const TTL = 60_000
let botId: string
let chatIds: string[]

async function openTurn(chatId: string) {
  const [row] = await db
    .insert(schema.turn)
    .values({ chatId, botId })
    .returning({ id: schema.turn.id })
  return row.id
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
  chatIds = [1, 2, 3].map((n) => `00000000-0000-4000-8000-00000000000${n}`)
  await db.insert(schema.chat).values(
    chatIds.map((id, index) => ({
      id,
      userId: "user-1",
      title: `Chat ${index + 1}`,
    }))
  )
})

beforeEach(async () => {
  await db.delete(schema.sandbox)
  await db.delete(schema.turn)
})

describe("sandbox lease", () => {
  it("gives a free lease to the first turn", async () => {
    const turn = await openTurn(chatIds[0])
    expect(await claimLease(botId, turn, TTL)).toEqual({
      acquired: true,
      wake: [],
    })
    expect(await claimLease(botId, turn, TTL)).toMatchObject({
      acquired: true,
    })
  })

  it("queues a second turn and says which chat holds the lease", async () => {
    const holder = await openTurn(chatIds[0])
    const waiter = await openTurn(chatIds[1])
    await claimLease(botId, holder, TTL)

    const busy = await claimLease(botId, waiter, TTL)
    expect(busy).toMatchObject({
      acquired: false,
      holder: { chatId: chatIds[0], title: "Chat 1", waitingOn: "work" },
    })
    expect(await listWaiterRefs(botId)).toEqual([])

    await claimLease(botId, waiter, TTL, "wait-1")
    expect(await listWaiterRefs(botId)).toEqual(["wait-1"])
  })

  it("hands the lease to the oldest waiter on release", async () => {
    const holder = await openTurn(chatIds[0])
    const first = await openTurn(chatIds[1])
    const second = await openTurn(chatIds[2])
    await claimLease(botId, holder, TTL)
    await claimLease(botId, first, TTL, "wait-first")
    await claimLease(botId, second, TTL, "wait-second")

    expect(await releaseLease(botId, holder, TTL)).toEqual([
      "wait-first",
      "wait-second",
    ])
    expect(await claimLease(botId, second, TTL)).toMatchObject({
      acquired: false,
      holder: { chatId: chatIds[1] },
    })
    expect(await claimLease(botId, first, TTL)).toMatchObject({
      acquired: true,
    })
    expect(await releaseLease(botId, first, TTL)).toEqual(["wait-second"])
    expect(await releaseLease(botId, second, TTL)).toEqual([])
    expect(await claimLease(botId, holder, TTL)).toMatchObject({
      acquired: true,
    })
  })

  it("reclaims a lease whose heartbeat stopped", async () => {
    const holder = await openTurn(chatIds[0])
    const next = await openTurn(chatIds[1])
    await claimLease(botId, holder, TTL)
    await db
      .update(schema.sandbox)
      .set({ leaseExpiresAt: new Date(Date.now() - 1000) })
      .where(eq(schema.sandbox.botId, botId))

    expect(await claimLease(botId, next, TTL)).toMatchObject({
      acquired: true,
    })
    expect(await renewLease(botId, holder, new Date(Date.now() + TTL))).toBe(
      false
    )
  })

  it("hands an expired lease to the queue before a newcomer", async () => {
    const holder = await openTurn(chatIds[0])
    const waiter = await openTurn(chatIds[1])
    const newcomer = await openTurn(chatIds[2])
    await claimLease(botId, holder, TTL)
    await claimLease(botId, waiter, TTL, "wait-waiter")
    await db
      .update(schema.sandbox)
      .set({ leaseExpiresAt: new Date(Date.now() - 1000) })
      .where(eq(schema.sandbox.botId, botId))

    expect(await claimLease(botId, newcomer, TTL, "wait-new")).toMatchObject({
      acquired: false,
      wake: ["wait-waiter"],
      holder: { chatId: chatIds[1] },
    })
    expect(await listWaiterRefs(botId)).toEqual(["wait-new"])
  })

  it("frees the lease when the holding turn has ended", async () => {
    const holder = await openTurn(chatIds[0])
    const next = await openTurn(chatIds[1])
    await claimLease(botId, holder, TTL)
    await db
      .update(schema.turn)
      .set({ endedAt: new Date() })
      .where(eq(schema.turn.id, holder))

    expect(await claimLease(botId, next, TTL)).toMatchObject({
      acquired: true,
    })
  })

  it("says the holder is waiting for you while you're in control", async () => {
    const holder = await openTurn(chatIds[0])
    const waiter = await openTurn(chatIds[1])
    await claimLease(botId, holder, TTL)
    await db
      .update(schema.sandbox)
      .set({ control: "user" })
      .where(eq(schema.sandbox.botId, botId))

    expect(await claimLease(botId, waiter, TTL)).toMatchObject({
      holder: { waitingOn: "control" },
    })
  })

  it("only extends the lease while renewing", async () => {
    const holder = await openTurn(chatIds[0])
    await claimLease(botId, holder, TTL)
    const later = new Date(Date.now() + 10 * TTL)
    await db
      .update(schema.sandbox)
      .set({ leaseExpiresAt: later })
      .where(eq(schema.sandbox.botId, botId))

    expect(await renewLease(botId, holder, new Date(Date.now() + TTL))).toBe(
      true
    )
    const [row] = await db
      .select({ expiresAt: schema.sandbox.leaseExpiresAt })
      .from(schema.sandbox)
    expect(row.expiresAt?.getTime()).toBe(later.getTime())
  })
})
