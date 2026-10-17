import type { ModelMessage, ToolApprovalStatus } from "ai"
import type { ToolGroup } from "@/lib/bot-schemas"
import type { approvalReason } from "@/server/db/schema"
import {
  isJudged,
  riskRule,
  type ToolCallInfo,
  type ToolRisk,
  toolGroup,
  type Verdict,
} from "./risk"

export const JUDGE_FAILED =
  "This couldn't be checked for safety, so it waits for you to look at it first."
const NOT_ALLOWED = "The person didn't allow this."

export type ApprovalReason = (typeof approvalReason.enumValues)[number]

type Assessment = {
  risk: ToolRisk
  ask: ApprovalReason | null
  reason?: string
}

export type ApprovalAnswer = { toolCallId: string; approved: boolean }

type Policy = {
  fullAuto: boolean
  askBefore: Record<ToolGroup, boolean>
  judge: (call: ToolCallInfo, messages: ModelMessage[]) => Promise<Verdict>
}

export async function assess(
  call: ToolCallInfo,
  messages: ModelMessage[],
  { fullAuto, askBefore, judge }: Policy
): Promise<Assessment> {
  const rule = riskRule(call)
  const verdict: Verdict = rule
    ? { critical: true, reason: rule }
    : isJudged(call)
      ? await judge(call, messages).catch(() => ({
          critical: true,
          reason: JUDGE_FAILED,
        }))
      : { critical: false, reason: "" }
  if (verdict.critical) {
    return { risk: "critical", ask: "critical", reason: verdict.reason }
  }
  const group = toolGroup(call)
  const asks = !fullAuto && group !== null && askBefore[group]
  return { risk: "normal", ask: asks ? "policy" : null }
}

export function approvalAnswers(messages: ModelMessage[]): ApprovalAnswer[] {
  const last = messages.at(-1)
  if (last?.role !== "tool") return []
  const calls = new Map<string, string>()
  for (const message of messages) {
    if (message.role !== "assistant" || typeof message.content === "string") {
      continue
    }
    for (const part of message.content) {
      if (part.type === "tool-approval-request") {
        calls.set(part.approvalId, part.toolCallId)
      }
    }
  }
  return last.content.flatMap((part) => {
    const toolCallId =
      part.type === "tool-approval-response" && calls.get(part.approvalId)
    return toolCallId ? [{ toolCallId, approved: part.approved }] : []
  })
}

type Call = ToolCallInfo & { toolCallId: string }

export function approvalGate({
  answered,
  approved,
  onResume,
  onAssessed,
  ...policy
}: Policy & {
  answered: ReadonlySet<string>
  approved: ReadonlySet<string>
  onResume: () => Promise<void>
  onAssessed: (call: Call, assessment: Assessment) => Promise<void>
}) {
  return async ({
    toolCall,
    messages,
  }: {
    toolCall: Call
    messages: ModelMessage[]
  }): Promise<ToolApprovalStatus> => {
    if (answered.has(toolCall.toolCallId)) {
      if (!approved.has(toolCall.toolCallId)) {
        return { type: "denied", reason: NOT_ALLOWED }
      }
      await onResume()
      return "approved"
    }
    const assessment = await assess(toolCall, messages, policy)
    await onAssessed(toolCall, assessment)
    if (!assessment.ask) return undefined
    return {
      type: "user-approval",
      reason: assessment.ask === "critical" ? assessment.reason : undefined,
    }
  }
}
