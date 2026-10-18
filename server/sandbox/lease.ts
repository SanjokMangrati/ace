import {
  claimLease,
  type LeaseHolder,
  listWaiterRefs,
  releaseLease,
  renewLease,
  setLeaseExpiry,
} from "@/server/db/queries/sandboxes"
import type { TurnRuntime } from "@/server/ports/turn-runtime"

export const LEASE_TTL_MS = 60_000
export const TAKEOVER_TIMEOUT_SEC = 24 * 60 * 60
export const ANSWER_TIMEOUT_SEC = 24 * 60 * 60
const HEARTBEAT_MS = 20_000
const WAKE_GRACE_MS = 5_000

type Waker = Pick<TurnRuntime, "completeWait">

async function wakeWaiters(runtime: Waker, refs: string[]) {
  await Promise.allSettled(refs.map((ref) => runtime.completeWait(ref)))
}

export async function releaseTurnLease(
  runtime: Waker,
  botId: string,
  turnId: string
) {
  await wakeWaiters(runtime, await releaseLease(botId, turnId, LEASE_TTL_MS))
}

export async function wakeBotWaiters(runtime: Waker, botId: string) {
  await wakeWaiters(runtime, await listWaiterRefs(botId))
}

export type SandboxLease = ReturnType<typeof sandboxLease>

export function sandboxLease({
  botId,
  turnId,
  runtime,
  onQueued,
  onStarted,
}: {
  botId: string
  turnId: string
  runtime: Pick<TurnRuntime, "createWait" | "completeWait" | "waitFor">
  onQueued: (holder: LeaseHolder) => void
  onStarted: (waitedFor: LeaseHolder) => void
}) {
  let held = false
  let heartbeat: ReturnType<typeof setInterval> | undefined

  function stopHeartbeat() {
    clearInterval(heartbeat)
    heartbeat = undefined
  }

  function startHeartbeat() {
    heartbeat ??= setInterval(() => {
      renewLease(botId, turnId, new Date(Date.now() + LEASE_TTL_MS)).then(
        (renewed) => {
          held = renewed
          if (!renewed) stopHeartbeat()
        },
        () => {}
      )
    }, HEARTBEAT_MS)
  }

  async function acquire() {
    let waitedFor: LeaseHolder | undefined
    let waitRef: string | undefined
    for (;;) {
      const claim = await claimLease(botId, turnId, LEASE_TTL_MS, waitRef)
      await wakeWaiters(runtime, claim.wake)
      if (claim.acquired) break
      if (waitRef) {
        waitedFor = claim.holder
        onQueued(claim.holder)
        await runtime.waitFor(waitRef)
        waitRef = undefined
      } else {
        const untilExpiry =
          claim.expiresAt.getTime() - Date.now() + WAKE_GRACE_MS
        waitRef = await runtime.createWait(
          Math.max(1, Math.ceil(untilExpiry / 1000))
        )
      }
    }
    held = true
    startHeartbeat()
    if (waitedFor) onStarted(waitedFor)
  }

  async function expireAt(until: Date) {
    await setLeaseExpiry(botId, turnId, until)
    await wakeBotWaiters(runtime, botId)
  }

  return {
    ensure: async () => {
      if (!held) await acquire()
    },
    park: expireAt,
    unpark: () => expireAt(new Date(Date.now() + LEASE_TTL_MS)),
    hold: async (until: Date) => {
      stopHeartbeat()
      held = false
      await expireAt(until)
    },
    release: async () => {
      stopHeartbeat()
      held = false
      await releaseTurnLease(runtime, botId, turnId)
    },
  }
}
