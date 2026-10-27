import type {
  TranscriptLoadOptions,
  TranscriptScope,
  TranscriptStorage,
} from "@trigger.dev/sdk/ai"
import type { UIMessage } from "ai"
import { forgetItemIds } from "@/server/agent/partial-reply"
import { loadTranscript, saveTranscript } from "@/server/db/queries/chats"

export const postgresTranscriptStorage: TranscriptStorage = {
  load: async <TUIMessage extends UIMessage>(
    { chatId }: TranscriptScope,
    opts?: TranscriptLoadOptions
  ) => {
    const transcript = await loadTranscript<TUIMessage>(chatId, opts)
    const partial = new Set(transcript.nonFinalIds)
    return {
      ...transcript,
      messages: transcript.messages.map((message) =>
        partial.has(message.id) ? forgetItemIds(message) : message
      ),
    }
  },
  save: ({ chatId }, { changes, cursors }) =>
    saveTranscript(chatId, changes, cursors),
}
