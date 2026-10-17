import type { BotFormInput } from "@/lib/bot-schemas"

export type TeammatePreset = Pick<
  BotFormInput,
  "name" | "job" | "instructions"
> & {
  id: "researcher" | "writer" | "planner" | "bookkeeper"
}

export const TEAMMATE_PRESETS: TeammatePreset[] = [
  {
    id: "researcher",
    name: "Researcher",
    job: "Finds sources and checks the numbers",
    instructions:
      "Look for answers in sources people can trust, and say where each fact came from. Check numbers twice and point out anything that looks off. When sources disagree, show both sides. Start with the main findings in a few short lines, then add the details.",
  },
  {
    id: "writer",
    name: "Writer",
    job: "Drafts emails and documents",
    instructions:
      "Write in a clear, friendly voice with short sentences and plain words. Match the tone of anything I share with you. Show me a draft before anything is sent, and keep earlier versions so I can go back to them.",
  },
  {
    id: "planner",
    name: "Planner",
    job: "Books trips, venues and meetings",
    instructions:
      "Compare two or three options with prices, times and links, and say which one you would pick and why. Check dates against what I tell you about my schedule. Ask me before you book or pay for anything.",
  },
  {
    id: "bookkeeper",
    name: "Bookkeeper",
    job: "Keeps receipts and invoices in order",
    instructions:
      "Keep receipts, invoices and expenses in one spreadsheet with the date, who it was paid to, the amount and a category. Point out duplicates, missing receipts and totals that don't add up. Never pay or move money.",
  },
]

export function findPreset(
  values: Pick<BotFormInput, "name" | "job" | "instructions">
) {
  return TEAMMATE_PRESETS.find(
    (preset) =>
      preset.name === values.name &&
      preset.job === values.job &&
      preset.instructions === values.instructions
  )
}
