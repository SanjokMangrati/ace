import { tool } from "ai"
import { z } from "zod"
import { PASSED_BACK } from "@/lib/chat"

export const MAX_HANDOFFS = 5

const note = z.string().trim().min(1).max(2000)

export class HandoffRejected extends Error {}

type Hop = { fromBotId: string; toBotId: string }

export function handoffRejection({
  fromBotId,
  toBotId,
  memberIds,
  hops,
  worked,
}: {
  fromBotId: string
  toBotId: string
  memberIds: string[]
  hops: Hop[]
  worked: boolean
}) {
  if (toBotId === fromBotId) {
    return "You can't pass this to yourself. Keep working on it."
  }
  if (!memberIds.includes(toBotId)) {
    return "That teammate isn't in this chat. Pass it to a teammate listed in your instructions, or keep working on it."
  }
  if (
    hops.some((hop) => hop.fromBotId === toBotId || hop.toBotId === toBotId)
  ) {
    return PASSED_BACK
  }
  if (hops.length >= MAX_HANDOFFS) {
    return `This task was already passed ${MAX_HANDOFFS} times since the person's last message. Finish it yourself, or tell the person where it stands.`
  }
  if (hops.length > 0 && !worked) {
    return "You haven't worked on this since it was passed to you. Move it forward yourself first, and pass it on only when the next step is another teammate's job."
  }
  return null
}

export function handoffTools(
  pass: (input: {
    toBotId: string
    summary: string
    nextStep: string
  }) => Promise<{ id: string; name: string; at: number }>
) {
  return {
    handoff: tool({
      description:
        "Pass the task to another teammate in this group chat when the next step is their job. They can read the chat but not your computer, so put everything they need in the summary. Your reply ends once they take it.",
      inputSchema: z.object({
        toBotId: z.uuid().describe("The id of the teammate to pass it to."),
        summary: note.describe(
          "What you did and found so far, with the facts the next teammate needs."
        ),
        nextStep: note.describe("Exactly what the next teammate should do."),
      }),
      execute: pass,
      toModelOutput: ({ output }) => ({
        type: "text",
        value: `You passed this to ${output.name}. ${output.name} takes it from here.`,
      }),
    }),
  }
}

export type HandoffTools = ReturnType<typeof handoffTools>
