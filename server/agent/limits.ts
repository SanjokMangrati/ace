import type { TurnNotice } from "@/lib/chat"
import type { CatalogModel } from "@/lib/models"
import type { TurnEndReason } from "@/server/db/queries/chats"

type Usage = { inputTokens?: number; outputTokens?: number }

export type Price = Pick<CatalogModel, "inputUsdPerMTok" | "outputUsdPerMTok">

export const DAY_MS = 24 * 60 * 60 * 1000

export function totalUsage(steps: readonly { usage: Usage }[]) {
  return steps.reduce(
    (total, step) => ({
      inputTokens: total.inputTokens + (step.usage.inputTokens ?? 0),
      outputTokens: total.outputTokens + (step.usage.outputTokens ?? 0),
    }),
    { inputTokens: 0, outputTokens: 0 }
  )
}

export function costUsd(price: Price | undefined, usage: Usage) {
  if (!price) return 0
  return (
    ((usage.inputTokens ?? 0) * price.inputUsdPerMTok +
      (usage.outputTokens ?? 0) * price.outputUsdPerMTok) /
    1_000_000
  )
}

export function endReason(turn: {
  stopped: boolean
  failed: boolean
  steps: readonly { finishReason: string }[]
  maxSteps: number
  costUsd: number
  taskBudgetUsd: number
}): TurnEndReason {
  if (turn.stopped) return "stopped"
  if (turn.failed) return "error"
  if (turn.steps.at(-1)?.finishReason !== "tool-calls") return "done"
  if (turn.costUsd >= turn.taskBudgetUsd) return "task_budget"
  if (turn.steps.length >= turn.maxSteps) return "step_limit"
  return "done"
}

export function turnNotice(
  reason: TurnEndReason,
  turn: {
    steps: number
    taskBudgetUsd: number
    dailyBudgetUsd: number
    failure: string
  }
): TurnNotice | null {
  switch (reason) {
    case "step_limit":
      return { reason, steps: turn.steps }
    case "task_budget":
      return { reason, limitUsd: turn.taskBudgetUsd }
    case "daily_budget":
      return { reason, limitUsd: turn.dailyBudgetUsd }
    case "error":
      return { reason, message: turn.failure }
    default:
      return null
  }
}
