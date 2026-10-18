import { randomUUID } from "node:crypto"
import { describe, expect, it } from "vitest"
import type { ChatRuntime } from "@/server/ports/chat-runtime"

export function chatRuntimeContract(name: string, make: () => ChatRuntime) {
  describe(`${name} ChatRuntime contract`, () => {
    it("mints a browser token for a chat", async () => {
      const token = await make().accessToken(randomUUID())
      expect(token).toEqual(expect.any(String))
      expect(token.length).toBeGreaterThan(0)
    })

    it("makes a wait and finishes it", async () => {
      const runtime = make()
      const ref = await runtime.createWait(60)
      expect(ref).toEqual(expect.any(String))
      await expect(runtime.completeWait(ref)).resolves.toBeUndefined()
    })

    it("closes a chat that has no session without failing", async () => {
      await expect(
        make().closeSession(randomUUID(), "contract test")
      ).resolves.toBeUndefined()
    })
  })
}
