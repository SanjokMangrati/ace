import { describe, expect, it } from "vitest"
import { PASSED_BACK } from "@/lib/chat"
import { handoffRejection, MAX_HANDOFFS } from "./handoff"

const pass = {
  fromBotId: "a",
  toBotId: "b",
  memberIds: ["a", "b", "c", "d"],
  hops: [],
  worked: false,
}

describe("handoffRejection", () => {
  it("lets the first teammate pass the task on before working on it", () => {
    expect(handoffRejection(pass)).toBeNull()
  })

  it("refuses passing to yourself or to someone outside the chat", () => {
    expect(handoffRejection({ ...pass, toBotId: "a" })).toMatch(/yourself/)
    expect(handoffRejection({ ...pass, toBotId: "x" })).toMatch(
      /isn't in this chat/
    )
  })

  it("refuses passing the task back to anyone who already held it", () => {
    const hops = [
      { fromBotId: "c", toBotId: "d" },
      { fromBotId: "d", toBotId: "a" },
    ]
    for (const toBotId of ["c", "d"]) {
      expect(handoffRejection({ ...pass, toBotId, hops, worked: true })).toBe(
        PASSED_BACK
      )
    }
  })

  it("stops long chains", () => {
    const hops = Array.from({ length: MAX_HANDOFFS }, (_, index) => ({
      fromBotId: `x${index}`,
      toBotId: `y${index}`,
    }))
    expect(handoffRejection({ ...pass, hops, worked: true })).toMatch(
      /already passed 5 times/
    )
  })

  it("makes a teammate that received the task move it forward first", () => {
    const hops = [{ fromBotId: "c", toBotId: "a" }]
    expect(handoffRejection({ ...pass, hops })).toMatch(/haven't worked/)
    expect(handoffRejection({ ...pass, hops, worked: true })).toBeNull()
  })
})
