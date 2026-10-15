import type { TranscriptStorage } from "@trigger.dev/sdk/ai"
import { loadTranscript, saveTranscript } from "@/server/db/queries/chats"

export const postgresTranscriptStorage: TranscriptStorage = {
  load: ({ chatId }, opts) => loadTranscript(chatId, opts),
  save: ({ chatId }, { changes, cursors }) =>
    saveTranscript(chatId, changes, cursors),
}
