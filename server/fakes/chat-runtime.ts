import type { ChatRuntime } from "@/server/ports/chat-runtime"
import type { TurnRuntime } from "@/server/ports/turn-runtime"

export function createFakeChatRuntime(
  runs: Pick<TurnRuntime, "createWait" | "completeWait">
): ChatRuntime & { sessions: Map<string, "open" | "closed"> } {
  const sessions = new Map<string, "open" | "closed">()
  return {
    sessions,
    startSession: async (chatId) => {
      sessions.set(chatId, "open")
      return { publicAccessToken: `token-${chatId}` }
    },
    accessToken: async (chatId) => `token-${chatId}`,
    closeSession: async (chatId) => {
      if (sessions.has(chatId)) sessions.set(chatId, "closed")
    },
    createWait: runs.createWait,
    completeWait: runs.completeWait,
  }
}
