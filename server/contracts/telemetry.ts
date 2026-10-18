import { generateText } from "ai"
import { MockLanguageModelV4 } from "ai/test"
import { describe, expect, it } from "vitest"
import type { Telemetry } from "@/server/ports/telemetry"

const scope = {
  chatId: "chat-1",
  userId: "user-1",
  botId: "bot-1",
  turnId: "turn-1",
}

export function telemetryContract(name: string, make: () => Telemetry) {
  describe(`${name} Telemetry contract`, () => {
    it("names the call and carries the scope", () => {
      const traced = make().modelCall("teammate-turn", scope)
      expect(traced.runtimeContext.trace).toEqual(scope)
      expect(traced.telemetry.functionId).toBe("teammate-turn")
    })

    it("plugs into a model call", async () => {
      const model = new MockLanguageModelV4({
        doGenerate: async () => ({
          content: [{ type: "text", text: "ok" }],
          finishReason: { unified: "stop", raw: undefined },
          usage: {
            inputTokens: {
              total: 1,
              noCache: 1,
              cacheRead: undefined,
              cacheWrite: undefined,
            },
            outputTokens: { total: 1, text: 1, reasoning: undefined },
          },
          warnings: [],
        }),
      })
      const result = await generateText({
        ...make().modelCall("risk-judge", scope),
        model,
        prompt: "hi",
      })
      expect(result.text).toBe("ok")
    })
  })
}
