"use client"

import type {
  ChatSessionPersistedState,
  TriggerChatTransport,
} from "@trigger.dev/sdk/chat"
import { useTriggerChatTransport } from "@trigger.dev/sdk/chat/react"
import {
  mintChatAccessToken,
  startChatSession,
} from "@/app/(app)/chats/actions"
import { TEAMMATE_CHAT_TASK } from "@/lib/chat"
import type { teammateChat } from "@/trigger/teammate-chat"

export type ChatSession = ChatSessionPersistedState

export function useChatTransport(chatId: string, session?: ChatSession) {
  return useTriggerChatTransport<typeof teammateChat>({
    task: TEAMMATE_CHAT_TASK,
    accessToken: ({ chatId }) => mintChatAccessToken(chatId),
    startSession: ({ chatId }) => startChatSession(chatId),
    sessions: session && { [chatId]: session },
  })
}

export function expectNextTurn(
  transport: TriggerChatTransport,
  chatId: string
) {
  const session = transport.getSession(chatId)
  if (!session) return
  transport.setSession(chatId, {
    ...session,
    isStreaming: true,
    activeInputSeq: 0,
  })
}
