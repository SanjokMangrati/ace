import { describe, expect, it } from "vitest"
import { costUsd, endReason, totalUsage, turnNotice } from "./limits"

const price = { inputUsdPerMTok: 2, outputUsdPerMTok: 10 }

function turn(overrides: Partial<Parameters<typeof endReason>[0]>) {
  return {
    stopped: false,
    failed: false,
    steps: [{ finishReason: "tool-calls" }],
    maxSteps: 1,
    costUsd: 0,
    taskBudgetUsd: 1,
    ...overrides,
  }
}

describe("costUsd", () => {
  it("prices input and output tokens per million", () => {
    expect(
      costUsd(price, { inputTokens: 1_000_000, outputTokens: 100_000 })
    ).toBe(3)
  })

  it("is free when the model has no price", () => {
    expect(costUsd(undefined, { inputTokens: 1000 })).toBe(0)
  })
})

describe("totalUsage", () => {
  it("adds up the steps and treats missing counts as zero", () => {
    expect(
      totalUsage([
        { usage: { inputTokens: 10, outputTokens: 5 } },
        { usage: { inputTokens: 3 } },
      ])
    ).toEqual({ inputTokens: 13, outputTokens: 5 })
  })
})

describe("endReason", () => {
  it("is done when the model finished on its own", () => {
    expect(endReason(turn({ steps: [{ finishReason: "stop" }] }))).toBe("done")
  })

  it("reports the step limit when the model wanted to keep going", () => {
    expect(endReason(turn({}))).toBe("step_limit")
  })

  it("reports the spending limit before the step limit", () => {
    expect(endReason(turn({ costUsd: 1 }))).toBe("task_budget")
  })

  it("puts a stop and a failure first", () => {
    expect(endReason(turn({ stopped: true, failed: true }))).toBe("stopped")
    expect(endReason(turn({ failed: true }))).toBe("error")
  })
})

describe("turnNotice", () => {
  const turn = {
    steps: 50,
    taskBudgetUsd: 1,
    dailyBudgetUsd: 5,
    failure: "Researcher couldn't reach Anthropic.",
  }

  it("explains each limit with its own number", () => {
    expect(turnNotice("step_limit", turn)).toEqual({
      reason: "step_limit",
      steps: 50,
    })
    expect(turnNotice("daily_budget", turn)).toEqual({
      reason: "daily_budget",
      limitUsd: 5,
    })
    expect(turnNotice("error", turn)).toEqual({
      reason: "error",
      message: "Researcher couldn't reach Anthropic.",
    })
  })

  it("says nothing when the turn finished or you stopped it", () => {
    expect(turnNotice("done", turn)).toBeNull()
    expect(turnNotice("stopped", turn)).toBeNull()
  })
})
