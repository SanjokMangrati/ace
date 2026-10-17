import type { ToolExecutionOptions, ToolSet } from "ai"
import { truncateMiddle } from "@/server/agent/sandbox-tools"
import type { toolCallStatus } from "@/server/db/schema"

const INPUT_LIMIT_CHARS = 300

export type ToolCallLedger = {
  start(call: {
    toolCallId: string
    toolName: string
    input: unknown
  }): Promise<void>
  finish(toolCallId: string, output: unknown): Promise<void>
  fail(toolCallId: string, error: string): Promise<void>
}

type LedgerCall = {
  toolName: string
  input: unknown
  status: (typeof toolCallStatus.enumValues)[number]
}

export function withLedger<TOOLS extends ToolSet>(
  tools: TOOLS,
  ledger: ToolCallLedger
): TOOLS {
  return Object.fromEntries(
    Object.entries(tools).map(([toolName, tool]) => {
      const execute = tool.execute
      if (!execute) return [toolName, tool]
      return [
        toolName,
        {
          ...tool,
          execute: async (
            input: unknown,
            options: ToolExecutionOptions<unknown>
          ) => {
            const { toolCallId } = options
            await ledger.start({ toolCallId, toolName, input })
            try {
              const output = await execute(input, options)
              await ledger.finish(toolCallId, output)
              return output
            } catch (error) {
              await ledger.fail(
                toolCallId,
                error instanceof Error ? error.message : String(error)
              )
              throw error
            }
          },
        },
      ]
    })
  ) as TOOLS
}

const OUTCOMES: Record<LedgerCall["status"], string> = {
  started: "cut off, it may or may not have happened",
  interrupted: "cut off, it may or may not have happened",
  finished: "finished",
  failed: "failed",
  waiting: "waited for the person's answer and didn't run",
  denied: "the person didn't allow it, so it didn't run",
}

export function interruptedNote(calls: LedgerCall[]) {
  const lines = calls.map(
    ({ toolName, input, status }) =>
      `- ${toolName} ${truncateMiddle(JSON.stringify(input) ?? "", INPUT_LIMIT_CHARS)}: ${OUTCOMES[status]}`
  )
  return [
    "Your last reply stopped unexpectedly before it finished. These are the actions it took:",
    ...lines,
    "Check the current state of your computer and files before you repeat any of them, so nothing happens twice.",
  ].join("\n")
}
