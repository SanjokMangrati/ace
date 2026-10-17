import "server-only"
import { and, eq } from "drizzle-orm"
import type { ApprovalReason } from "@/server/agent/approvals"
import type { ToolRisk } from "@/server/agent/risk"
import { db } from "@/server/db/client"
import { approval, toolCall } from "@/server/db/schema"

type NewToolCall = { toolCallId: string; toolName: string; input: unknown }

export function toolCallLedger(
  turnId: string,
  riskOf: (toolCallId: string) => ToolRisk | undefined
) {
  const call = (toolCallId: string) =>
    and(eq(toolCall.turnId, turnId), eq(toolCall.toolCallId, toolCallId))
  return {
    start: async (values: NewToolCall) => {
      const risk = riskOf(values.toolCallId)
      const rows = risk
        ? await db
            .insert(toolCall)
            .values({ ...values, turnId, risk })
            .returning({ id: toolCall.toolCallId })
        : await db
            .update(toolCall)
            .set({ status: "started", startedAt: new Date() })
            .where(and(call(values.toolCallId), eq(toolCall.status, "waiting")))
            .returning({ id: toolCall.toolCallId })
      if (rows.length === 0) {
        throw new Error("This action wasn't checked first, or it already ran.")
      }
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

export async function askApproval(
  turnId: string,
  values: NewToolCall & { risk: ToolRisk; reason: ApprovalReason }
) {
  const { reason, ...call } = values
  await db.transaction(async (tx) => {
    await tx.insert(toolCall).values({ ...call, turnId, status: "waiting" })
    await tx
      .insert(approval)
      .values({ turnId, toolCallId: call.toolCallId, reason })
  })
}
