import { describe, expect, it } from "vitest"
import type { TurnRuntime } from "@/server/ports/turn-runtime"

export function turnRuntimeContract(name: string, make: () => TurnRuntime) {
  describe(`${name} TurnRuntime contract`, () => {
    it("parks on a wait until it is finished", async () => {
      const runtime = make()
      const ref = await runtime.createWait(60)
      let woke = false
      const parked = runtime.waitFor(ref).then(() => {
        woke = true
      })
      await new Promise((resolve) => setTimeout(resolve, 10))
      expect(woke).toBe(false)
      await runtime.completeWait(ref)
      await parked
      expect(woke).toBe(true)
    })
  })
}
