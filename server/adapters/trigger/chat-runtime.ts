import { auth, NotFoundError, sessions } from "@trigger.dev/sdk"
import { chat } from "@trigger.dev/sdk/ai"
import { TEAMMATE_CHAT_TASK } from "@/lib/chat"
import type { ChatRuntime } from "@/server/ports/chat-runtime"

export function createTriggerChatRuntime(): ChatRuntime {
  const start = chat.createStartSessionAction(TEAMMATE_CHAT_TASK)

  return {
    startSession: (chatId) => start({ chatId }),
    accessToken: (chatId) =>
      auth.createPublicToken({
        scopes: { read: { sessions: chatId }, write: { sessions: chatId } },
        expirationTime: "1h",
      }),
    closeSession: async (chatId) => {
      try {
        await sessions.close(chatId, { reason: "teammate deleted" })
      } catch (error) {
        if (!(error instanceof NotFoundError)) throw error
      }
    },
  }
}
