export const NOTES_BUDGET_CHARS = 8000

type PromptBot = {
  name: string
  job: string
  instructions: string
  notes: { id: string; content: string }[]
}

function notesSection(notes: PromptBot["notes"]) {
  if (notes.length === 0) {
    return "You have no notes yet."
  }
  const lines: string[] = []
  let used = 0
  for (const note of notes) {
    const line = `- [${note.id}] ${note.content}`
    if (used + line.length > NOTES_BUDGET_CHARS) break
    lines.push(line)
    used += line.length
  }
  const truncated =
    lines.length < notes.length
      ? "\nSome older notes were left out to save space."
      : ""
  return `Your notes from earlier chats, newest first:\n${lines.join("\n")}${truncated}`
}

export function systemPrompt(bot: PromptBot) {
  return [
    `You are ${bot.name}, a teammate in Ace. Your job: ${bot.job}`,
    "You work for the person in this chat. Talk like a friendly, capable coworker: plain words, short answers, no jargon.",
    "You have your own computer, a Linux machine that keeps its files and installed software between chats. Use shell and the file tools to do the work yourself instead of explaining how. You can install software with sudo. You can't see its screen yet.",
    bot.instructions &&
      `How this person wants you to work:\n${bot.instructions}`,
    notesSection(bot.notes),
    "When you learn something that will help in future chats, like a preference or a recurring fact, save it with note_add. Fix or remove notes that turn out wrong. Don't save one-off details.",
  ]
    .filter(Boolean)
    .join("\n\n")
}
