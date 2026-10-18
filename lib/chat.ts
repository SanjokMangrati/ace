import type { InferUITools, UIMessage } from "ai"
import type { z } from "zod"
import type { computerInputSchema } from "@/server/agent/computer"
import type { HandoffTools } from "@/server/agent/handoff"
import type { NoteTools } from "@/server/agent/notes"
import type { SandboxTools } from "@/server/agent/sandbox-tools"
import type { WebTools } from "@/server/agent/web-tools"
import type {
  ComputerOutput,
  NativeComputerInput,
} from "@/server/ports/computer"

export const TEAMMATE_CHAT_TASK = "teammate-chat"

const TITLE_MAX_LENGTH = 80

export type ControlEvent = { tookAt: number; gaveAt?: number; botId?: string }

export type QueueEvent = {
  chatId: string
  title: string
  waitingOn: "work" | "control" | "answer"
  startedAt?: number
}

type AnswerEvent = { toolCallId: string; at: number; askedAt: number }

export type HandoffEvent = {
  id: string
  fromBotId: string
  toBotId: string
  summary: string
  nextStep: string
}

type MessageMetadata = {
  createdAt?: number
  resumedAt?: number
  finishedAt?: number
  botId?: string
  control?: ControlEvent
  handoff?: HandoffEvent
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
  {
    notice: TurnNotice
    control: ControlEvent
    queue: QueueEvent
    answer: AnswerEvent
  },
  InferUITools<NoteTools & SandboxTools & HandoffTools & WebTools> & {
    computer: ComputerUITool
  }
>

type Teammate = { id: string; name: string }

export const PASSED_BACK =
  "That teammate already worked on this since the person's last message, so passing it back would go in circles. Finish it yourself, or tell the person what's missing."

export function nameList(names: string[]) {
  if (names.length < 2) return names.join("")
  return `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`
}

function mentions(team: Teammate[]) {
  const names = team.map((teammate) =>
    teammate.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  )
  return new RegExp(`@(${names.join("|")})(?![\\p{L}\\p{N}_])`, "giu")
}

export function mentionedTeammate<T extends Teammate>(text: string, team: T[]) {
  const name = mentions(team).exec(text)?.[1].toLowerCase()
  return team.find((teammate) => teammate.name.toLowerCase() === name)
}

export function splitMentions(text: string, team: Teammate[]) {
  const pieces: { at: number; text: string; mention: boolean }[] = []
  let at = 0
  for (const match of text.matchAll(mentions(team))) {
    pieces.push({ at, text: text.slice(at, match.index), mention: false })
    pieces.push({ at: match.index, text: match[0], mention: true })
    at = match.index + match[0].length
  }
  pieces.push({ at, text: text.slice(at), mention: false })
  return pieces.filter((piece) => piece.text)
}

export function messageText(message: TeammateMessage) {
  return message.parts
    .map((part) => (part.type === "text" ? part.text : ""))
    .join("")
}

export function nextTeammate<T extends Teammate>(
  message: TeammateMessage | undefined,
  team: T[],
  lastBotId: string | null
) {
  const metadata = message?.metadata
  const routed =
    team.find((teammate) => teammate.id === metadata?.handoff?.toBotId) ??
    (message && mentionedTeammate(messageText(message), team)) ??
    team.find((teammate) => teammate.id === lastBotId)
  return routed ?? team[0]
}

export function handoffMessage(
  handoff: HandoffEvent,
  names: { from: string; to: string },
  at: number
): TeammateMessage {
  return {
    id: `handoff-${handoff.id}`,
    role: "user",
    parts: [
      {
        type: "text",
        text: `${names.from} passed this to ${names.to}.\n\nWhat's done: ${handoff.summary}\n\nNext step: ${handoff.nextStep}`,
      },
    ],
    metadata: { createdAt: at, handoff },
  }
}

export function controlMessage(
  id: string,
  control: Required<ControlEvent>
): TeammateMessage {
  return {
    id,
    role: "user",
    parts: [
      {
        type: "text",
        text: "I used your screen for a while and gave you back control. Look at it again before you use it.",
      },
    ],
    metadata: { createdAt: control.gaveAt, control },
  }
}

export function chatTitle(text: string, team: Teammate[]) {
  const leadingMentions = new RegExp(
    `^(?:${mentions(team).source}[\\s,:]*)+`,
    "iu"
  )
  const first = text.trim().split("\n")[0].trim()
  const rest = first.replace(leadingMentions, "")
  const line = rest ? rest.charAt(0).toUpperCase() + rest.slice(1) : first
  if (line.length <= TITLE_MAX_LENGTH) return line
  const cut = line.slice(0, TITLE_MAX_LENGTH)
  const space = cut.lastIndexOf(" ")
  return `${(space > TITLE_MAX_LENGTH / 2 ? cut.slice(0, space) : cut).trimEnd()}…`
}
