import { tool } from "ai"
import { describe, expect, it, vi } from "vitest"
import { z } from "zod"
import { interruptedNote, type ToolCallLedger, withLedger } from "./ledger"

const options = { toolCallId: "call-1", messages: [], context: {} }

function ledgered(
  execute: (input: { text: string }) => Promise<string>,
  start = async () => {}
) {
  const events: string[] = []
  const ledger = {
    start: vi.fn(async (call) => {
      events.push(`start ${call.toolName}`)
      await start()
    }),
    finish: vi.fn(async () => {
      events.push("finish")
    }),
    fail: vi.fn(async () => {
      events.push("fail")
    }),
  } satisfies ToolCallLedger
  const tools = withLedger(
    {
      echo: tool({
        inputSchema: z.object({ text: z.string() }),
        execute: async (input) => {
          events.push("execute")
          return execute(input)
        },
      }),
    },
    ledger
  )
  return {
    run: () => tools.echo.execute?.({ text: "hi" }, options),
    ledger,
    events,
  }
}

describe("withLedger", () => {
  it("records the call before it runs and the output after", async () => {
    const { run, ledger, events } = ledgered(async ({ text }) => text)

    await expect(run()).resolves.toBe("hi")
    expect(events).toEqual(["start echo", "execute", "finish"])
    expect(ledger.start).toHaveBeenCalledWith({
      toolCallId: "call-1",
      toolName: "echo",
      input: { text: "hi" },
    })
    expect(ledger.finish).toHaveBeenCalledWith("call-1", "hi")
  })

  it("records a failed call and still throws to the model", async () => {
    const { run, ledger, events } = ledgered(async () => {
      throw new Error("No such file.")
    })

    await expect(run()).rejects.toThrow("No such file.")
    expect(events).toEqual(["start echo", "execute", "fail"])
    expect(ledger.fail).toHaveBeenCalledWith("call-1", "No such file.")
  })

  it("never runs a call it could not record", async () => {
    const { run, events } = ledgered(
      async ({ text }) => text,
      async () => {
        throw new Error("Database is down.")
      }
    )

    await expect(run()).rejects.toThrow("Database is down.")
    expect(events).toEqual(["start echo"])
  })
})

describe("interruptedNote", () => {
  it("lists every action of the last reply and says which were cut off", () => {
    const note = interruptedNote([
      { toolName: "shell", input: { command: "ls" }, status: "finished" },
      {
        toolName: "fs_write",
        input: { path: "a.txt", content: "x".repeat(1000) },
        status: "interrupted",
      },
    ])

    expect(note).toContain('- shell {"command":"ls"}: finished')
    expect(note).toContain('- fs_write {"path":"a.txt","content":"xxx')
    expect(note).toContain("characters cut")
    expect(note).toContain(": cut off, it may or may not have happened")
    expect(note).toContain("before you repeat any of them")
  })
})
