import type { TeammateMessage, TurnNotice } from "@/lib/chat"

type Part = TeammateMessage["parts"][number]

type StepState = "running" | "done" | "failed"

export type Step = { key: string; state: StepState } & (
  | { kind: "think" }
  | { kind: "remember" | "forget"; content?: string }
  | { kind: "command"; purpose?: string; command?: string; output?: string }
  | { kind: "read" | "save" | "look"; name?: string }
)

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

function stepOf(part: Part, index: number): Step | null {
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
    default:
      return null
  }
}

export function readMessage(message: TeammateMessage) {
  const steps: Step[] = []
  const texts: string[] = []
  const notices: TurnNotice[] = []

  for (const [index, part] of message.parts.entries()) {
    if (part.type === "text") {
      if (part.text.trim()) texts.push(part.text)
    } else if (part.type === "data-notice") {
      notices.push(part.data)
    } else {
      const step = stepOf(part, index)
      const last = steps.at(-1)
      if (step?.kind === "think" && last?.kind === "think") {
        steps[steps.length - 1] = step
      } else if (step) {
        steps.push(step)
      }
    }
  }

  return { steps, text: texts.join("\n\n"), notices }
}
