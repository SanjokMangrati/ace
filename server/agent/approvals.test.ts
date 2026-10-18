import type { ModelMessage } from "ai"
import { describe, expect, it, vi } from "vitest"
import { DEFAULT_ASK_BEFORE } from "@/lib/bot-schemas"
import {
  approvalAnswers,
  approvalGate,
  assess,
  JUDGE_FAILED,
} from "./approvals"

const shell = (command: string) => ({ toolName: "shell", input: { command } })
const normal = async () => ({ critical: false, reason: "" })
const policy = { fullAuto: false, askBefore: DEFAULT_ASK_BEFORE, judge: normal }

describe("assess", () => {
  it("asks for critical calls even in full auto", async () => {
    expect(
      await assess(shell("npm publish"), [], { ...policy, fullAuto: true })
    ).toMatchObject({ risk: "critical", ask: "critical" })
  })

  it("asks when the judge says critical, and when the judge fails", async () => {
    const critical = async () => ({ critical: true, reason: "This pays." })
    expect(
      await assess(shell("pay"), [], { ...policy, judge: critical })
    ).toEqual({ risk: "critical", ask: "critical", reason: "This pays." })
    const broken = () => Promise.reject(new Error("timeout"))
    expect(
      await assess(shell("ls"), [], {
        ...policy,
        fullAuto: true,
        judge: broken,
      })
    ).toEqual({ risk: "critical", ask: "critical", reason: JUDGE_FAILED })
  })

  it("follows the teammate's settings for normal calls", async () => {
    expect(await assess(shell("ls"), [], policy)).toEqual({
      risk: "normal",
      ask: "policy",
    })
    expect(
      await assess(shell("ls"), [], { ...policy, fullAuto: true })
    ).toEqual({ risk: "normal", ask: null })
    expect(
      await assess(
        { toolName: "fs_read", input: { path: "a.csv" } },
        [],
        policy
      )
    ).toEqual({ risk: "normal", ask: null })
  })

  it("only asks the judge about judged tools", async () => {
    const judge = vi.fn(normal)
    await assess({ toolName: "fs_list", input: {} }, [], { ...policy, judge })
    expect(judge).not.toHaveBeenCalled()
  })
})

describe("approvalAnswers", () => {
  it("reads the answers in the last tool message", () => {
    const messages: ModelMessage[] = [
      {
        role: "assistant",
        content: [
          { type: "tool-call", toolCallId: "c1", toolName: "shell", input: {} },
          { type: "tool-approval-request", approvalId: "a1", toolCallId: "c1" },
        ],
      },
      {
        role: "tool",
        content: [
          { type: "tool-approval-response", approvalId: "a1", approved: false },
        ],
      },
    ]
    expect(approvalAnswers(messages)).toEqual([
      { toolCallId: "c1", approved: false },
    ])
    expect(
      approvalAnswers([...messages, { role: "user", content: "hi" }])
    ).toEqual([])
  })
})

describe("approvalGate", () => {
  function gate() {
    const onAssessed = vi.fn(async () => {})
    const onResume = vi.fn(async () => {})
    return {
      onAssessed,
      onResume,
      check: approvalGate({
        ...policy,
        answered: new Set(["ok", "stale"]),
        approved: new Set(["ok"]),
        onResume,
        onAssessed,
      }),
    }
  }
  const call = (toolCallId: string, command: string) => ({
    toolCall: { toolCallId, ...shell(command) },
    messages: [],
  })

  it("asks with the reason only for critical calls", async () => {
    const { check, onAssessed } = gate()
    expect(await check(call("new", "ls"))).toEqual({
      type: "user-approval",
      reason: undefined,
    })
    expect(await check(call("new", "npm publish"))).toMatchObject({
      type: "user-approval",
      reason: expect.stringContaining("publishes"),
    })
    expect(onAssessed).toHaveBeenCalledTimes(2)
  })

  it("lets approved calls run once the lease is back and denies the rest", async () => {
    const { check, onResume, onAssessed } = gate()
    expect(await check(call("ok", "ls"))).toBe("approved")
    expect(onResume).toHaveBeenCalledOnce()
    expect(await check(call("stale", "ls"))).toMatchObject({ type: "denied" })
    expect(onAssessed).not.toHaveBeenCalled()
  })
})
