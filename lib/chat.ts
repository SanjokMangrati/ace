import type { InferUITools, UIMessage } from "ai"
import type { z } from "zod"
import type { computerInputSchema } from "@/server/agent/computer"
import type { NoteTools } from "@/server/agent/notes"
import type { SandboxTools } from "@/server/agent/sandbox-tools"
import type {
  ComputerOutput,
  NativeComputerInput,
} from "@/server/ports/computer"

export const TEAMMATE_CHAT_TASK = "teammate-chat"

const TITLE_MAX_LENGTH = 80

export type ControlEvent = { tookAt: number; gaveAt?: number }

export type QueueEvent = {
  chatId: string
  title: string
  waitingOn: "work" | "you"
  startedAt?: number
}

type MessageMetadata = {
  createdAt?: number
  finishedAt?: number
  control?: ControlEvent
}

export type TurnNotice =
  | { reason: "step_limit"; steps: number }
  | { reason: "task_budget" | "daily_budget"; limitUsd: number }
  | { reason: "error"; message: string }

type ComputerUITool = {
  input: z.input<typeof computerInputSchema> | NativeComputerInput
  output: ComputerOutput
}

export type TeammateMessage = UIMessage<
  MessageMetadata,
  { notice: TurnNotice; control: ControlEvent; queue: QueueEvent },
  InferUITools<NoteTools & SandboxTools> & { computer: ComputerUITool }
>

export function chatTitle(text: string) {
  const line = text.trim().split("\n")[0].trim()
  if (line.length <= TITLE_MAX_LENGTH) return line
  const cut = line.slice(0, TITLE_MAX_LENGTH)
  const space = cut.lastIndexOf(" ")
  return `${(space > TITLE_MAX_LENGTH / 2 ? cut.slice(0, space) : cut).trimEnd()}…`
}
