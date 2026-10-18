import { describe, expect, it } from "vitest"
import type { Logger } from "@/server/ports/logger"

type Captured = { logger: Logger; lines: () => Record<string, unknown>[] }

export function loggerContract(name: string, make: () => Captured) {
  describe(`${name} Logger contract`, () => {
    it("writes the message with its fields", () => {
      const { logger, lines } = make()
      logger.info("Turn ended", { endReason: "done", stepCount: 3 })
      expect(lines()).toEqual([
        expect.objectContaining({
          msg: "Turn ended",
          endReason: "done",
          stepCount: 3,
        }),
      ])
    })

    it("keeps a child's fields on every line it writes", () => {
      const { logger, lines } = make()
      const child = logger.child({ chatId: "chat-1" }).child({ turnId: "t-1" })
      child.warn("Slow step")
      child.error("Failed", { err: new Error("boom") })
      expect(lines()).toEqual([
        expect.objectContaining({
          msg: "Slow step",
          chatId: "chat-1",
          turnId: "t-1",
        }),
        expect.objectContaining({
          msg: "Failed",
          chatId: "chat-1",
          turnId: "t-1",
          err: expect.objectContaining({ message: "boom" }),
        }),
      ])
    })
  })
}
