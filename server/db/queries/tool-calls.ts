import "server-only"
import { and, eq } from "drizzle-orm"
import { db } from "@/server/db/client"
import { toolCall } from "@/server/db/schema"

export function toolCallLedger(turnId: string) {
  const call = (toolCallId: string) =>
    and(eq(toolCall.turnId, turnId), eq(toolCall.toolCallId, toolCallId))
  return {
    start: async (values: {
      toolCallId: string
      toolName: string
      input: unknown
    }) => {
      await db.insert(toolCall).values({ ...values, turnId })
    },
    finish: async (toolCallId: string, output: unknown) => {
      await db
        .update(toolCall)
        .set({ status: "finished", output, finishedAt: new Date() })
        .where(call(toolCallId))
    },
    fail: async (toolCallId: string, error: string) => {
      await db
        .update(toolCall)
        .set({ status: "failed", error, finishedAt: new Date() })
        .where(call(toolCallId))
    },
  }
}
