import type { TeammateMessage, TurnNotice } from "@/lib/chat"

type Part = TeammateMessage["parts"][number]

type StepState = "running" | "done" | "failed"

export type Step = { key: string; state: StepState } & (
  | { kind: "think" }
  | { kind: "remember" | "forget"; content?: string }
)

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
