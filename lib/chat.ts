import type { InferUITools, UIMessage } from "ai"
import type { NoteTools } from "@/server/agent/notes"

export const TEAMMATE_CHAT_TASK = "teammate-chat"

const TITLE_MAX_LENGTH = 80

type MessageMetadata = { createdAt?: number; finishedAt?: number }

export type TurnNotice =
  | { reason: "step_limit"; steps: number }
  | { reason: "task_budget" | "daily_budget"; limitUsd: number }
  | { reason: "error"; message: string }

export type TeammateMessage = UIMessage<
  MessageMetadata,
  { notice: TurnNotice },
  InferUITools<NoteTools>
>

export function chatTitle(text: string) {
  const line = text.trim().split("\n")[0].trim()
  if (line.length <= TITLE_MAX_LENGTH) return line
  const cut = line.slice(0, TITLE_MAX_LENGTH)
  const space = cut.lastIndexOf(" ")
  return `${(space > TITLE_MAX_LENGTH / 2 ? cut.slice(0, space) : cut).trimEnd()}…`
}
