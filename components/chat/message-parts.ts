import { isToolUIPart } from "ai"
import {
  PASSED_BACK,
  type QueueEvent,
  type TeammateMessage,
  type TurnNotice,
} from "@/lib/chat"
import { siteOf } from "@/lib/format"

type Part = TeammateMessage["parts"][number]

type StepState = "running" | "done" | "failed"

type ScreenVerb =
  | "look"
  | "open"
  | "click"
  | "type"
  | "scroll"
  | "move"
  | "wait"

export type Shot = { id: string; width: number; height: number }

export type Step = { key: string; state: StepState } & (
  | { kind: "think" }
  | { kind: "remember" | "forget"; content?: string }
  | { kind: "command"; purpose?: string; command?: string; output?: string }
  | { kind: "read" | "save" | "look"; name?: string }
  | { kind: "search"; query?: string }
  | { kind: "fetch"; site?: string; title?: string }
  | {
      kind: "screen"
      verb: ScreenVerb
      intent?: string
      text?: string
      shot?: Shot
      at?: { x: number; y: number }
    }
  | { kind: "control" }
  | { kind: "handoff"; to: string; back: boolean }
)

const screenVerbs: Record<string, ScreenVerb> = {
  screenshot: "look",
  cursor_position: "look",
  open_url: "open",
  click: "click",
  left_click: "click",
  right_click: "click",
  middle_click: "click",
  double_click: "click",
  triple_click: "click",
  type: "type",
  key: "type",
  scroll: "scroll",
  move: "move",
  mouse_move: "move",
  drag: "move",
  left_click_drag: "move",
  wait: "wait",
}

type ComputerPart = Extract<Part, { type: "tool-computer" }>

function screenStep(part: ComputerPart): Step {
  const input = part.input
  const action = input?.action
  const generic = typeof action === "object" ? action : undefined
  const [x, y] =
    generic && "x" in generic
      ? [generic.x, generic.y]
      : input && "coordinate" in input
        ? (input.coordinate ?? [])
        : []
  return {
    key: part.toolCallId,
    kind: "screen",
    state: toolState(part.state),
    verb: screenVerbs[generic?.type ?? String(action)] ?? "look",
    intent: input && "intent" in input ? input.intent : undefined,
    text:
      generic && "text" in generic
        ? generic.text
        : generic && "keys" in generic
          ? generic.keys
          : generic && "url" in generic
            ? generic.url
            : input && "text" in input
              ? input.text
              : undefined,
    shot:
      part.state === "output-available" ? part.output.screenshot : undefined,
    at: typeof x === "number" && typeof y === "number" ? { x, y } : undefined,
  }
}

const HOME = new Set(["", ".", "./", "~", "~/"])

function fileName(path: string | undefined) {
  if (path === undefined) return undefined
  if (HOME.has(path.trim())) return "the home folder"
  return path.split("/").filter(Boolean).at(-1) ?? path
}

function toolState(state: string): StepState {
  if (state === "output-available") return "done"
  if (state === "output-error" || state === "output-denied") return "failed"
  return "running"
}

function stepOf(
  part: Part,
  index: number,
  names: Map<string, string>
): Step | null {
  switch (part.type) {
    case "reasoning":
      return {
        key: `think-${index}`,
        kind: "think",
        state: part.state === "streaming" ? "running" : "done",
      }
    case "tool-note_add":
    case "tool-note_update":
      return {
        key: part.toolCallId,
        kind: "remember",
        state: toolState(part.state),
        content: part.input?.content,
      }
    case "tool-note_delete":
      return {
        key: part.toolCallId,
        kind: "forget",
        state: toolState(part.state),
        content:
          part.state === "output-available" ? part.output.content : undefined,
      }
    case "tool-shell":
      return {
        key: part.toolCallId,
        kind: "command",
        state: toolState(part.state),
        purpose: part.input?.purpose,
        command: part.input?.command,
        output:
          part.state === "output-available" ? part.output.output : undefined,
      }
    case "tool-fs_read":
      return {
        key: part.toolCallId,
        kind: "read",
        state: toolState(part.state),
        name: fileName(part.input?.path),
      }
    case "tool-fs_write":
      return {
        key: part.toolCallId,
        kind: "save",
        state: toolState(part.state),
        name: fileName(part.input?.path),
      }
    case "tool-fs_list":
      return {
        key: part.toolCallId,
        kind: "look",
        state: toolState(part.state),
        name:
          part.state === "input-streaming"
            ? undefined
            : fileName(part.input?.path ?? "."),
      }
    case "tool-web_search":
      return {
        key: part.toolCallId,
        kind: "search",
        state: toolState(part.state),
        query: part.input?.query,
      }
    case "tool-web_fetch":
      return {
        key: part.toolCallId,
        kind: "fetch",
        state: toolState(part.state),
        site:
          part.input?.url === undefined ? undefined : siteOf(part.input.url),
        title:
          part.state === "output-available"
            ? (part.output.title ?? undefined)
            : undefined,
      }
    case "tool-computer":
      return screenStep(part)
    case "tool-handoff":
      return {
        key: part.toolCallId,
        kind: "handoff",
        state: toolState(part.state),
        to: names.get(part.input?.toBotId ?? "") ?? "a teammate",
        back: part.state === "output-error" && part.errorText === PASSED_BACK,
      }
    case "data-control":
      return {
        key: part.id ?? `control-${index}`,
        kind: "control",
        state: part.data.gaveAt === undefined ? "running" : "done",
      }
    default:
      return null
  }
}

export type Ask = {
  step: Step
  approvalId: string
  careful?: string
  answer: "pending" | "allowed" | "denied"
  answeredAt?: number
  shot?: Shot
}

export type Segment = { steps: Step[]; text: string; asks: Ask[] }

type Draft = { steps: Step[]; texts: string[]; asks: Ask[] }

const PARAGRAPH = "\n\n"

function draft(): Draft {
  return { steps: [], texts: [], asks: [] }
}

function approvalOf(
  part: Part
): Pick<Ask, "approvalId" | "careful" | "answer"> | null {
  if (!isToolUIPart(part) || !part.approval || part.approval.isAutomatic) {
    return null
  }
  return {
    approvalId: part.approval.id,
    careful: part.approval.requestReason,
    answer:
      part.state === "approval-requested"
        ? "pending"
        : part.approval.approved
          ? "allowed"
          : "denied",
  }
}

export function readMessage(
  message: TeammateMessage,
  names: Map<string, string>
) {
  const notices: TurnNotice[] = []
  let queue: QueueEvent | undefined
  const answeredAt = new Map<string, number>()
  for (const part of message.parts) {
    if (part.type === "data-answer") {
      answeredAt.set(part.data.toolCallId, part.data.at)
    }
  }

  const drafts: Draft[] = [draft()]
  let current = drafts[0]
  let shot: Shot | undefined

  for (const [index, part] of message.parts.entries()) {
    if (part.type === "text") {
      if (part.text.trim()) current.texts.push(part.text)
      continue
    }
    if (part.type === "data-notice") {
      notices.push(part.data)
      continue
    }
    if (part.type === "data-queue") {
      queue = part.data
      continue
    }
    const step = stepOf(part, index, names)
    if (!step) continue
    const approval = approvalOf(part)
    if (approval) {
      current.asks.push({
        ...approval,
        step,
        answeredAt: answeredAt.get(step.key),
        shot,
      })
      current = draft()
      drafts.push(current)
      if (approval.answer !== "allowed") continue
    }
    if (step.kind === "screen" && step.shot) shot = step.shot
    const last = current.steps.at(-1)
    if (step.kind === "think" && last?.kind === "think") {
      current.steps[current.steps.length - 1] = step
    } else {
      current.steps.push(step)
    }
  }

  const segments = drafts.map(
    ({ steps, texts, asks }): Segment => ({
      steps,
      text: texts.join(PARAGRAPH),
      asks,
    })
  )
  return { segments, notices, queue }
}
