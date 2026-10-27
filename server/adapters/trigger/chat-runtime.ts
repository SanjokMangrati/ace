import { auth, NotFoundError, runs, sessions } from "@trigger.dev/sdk"
import { chat } from "@trigger.dev/sdk/ai"
import { TEAMMATE_CHAT_TASK } from "@/lib/chat"
import type { ChatRuntime } from "@/server/ports/chat-runtime"
import { triggerTurnRuntime } from "./turn-runtime"

export function createTriggerChatRuntime(): ChatRuntime {
  const start = chat.createStartSessionAction(TEAMMATE_CHAT_TASK)

  return {
    startSession: (chatId) => start({ chatId }),
    accessToken: (chatId) =>
      auth.createPublicToken({
        scopes: { read: { sessions: chatId }, write: { sessions: chatId } },
        expirationTime: "1h",
      }),
    isRunning: async (chatId) => {
      try {
        const { currentRunId } = await sessions.retrieve(chatId)
        return (
          currentRunId != null &&
          !(await runs.retrieve(currentRunId)).isCompleted
        )
      } catch (error) {
        if (error instanceof NotFoundError) return false
        throw error
      }
    },
    closeSession: async (chatId, reason) => {
      try {
        await sessions.close(chatId, { reason })
      } catch (error) {
        if (!(error instanceof NotFoundError)) throw error
      }
    },
    createWait: triggerTurnRuntime.createWait,
    completeWait: triggerTurnRuntime.completeWait,
  }
}
