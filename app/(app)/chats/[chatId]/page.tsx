import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { cache } from "react"
import { ChatView } from "@/components/chat/chat-view"
import { chatIdSchema } from "@/lib/chat-schemas"
import { teammatePictureUrl } from "@/lib/format"
import { chatRuntime } from "@/server/container"
import { findChat } from "@/server/db/queries/chats"
import { listProviderKeyModels } from "@/server/provider-key-models"
import { requireUser } from "@/server/session"

const loadChat = cache(async (chatId: string) => {
  const id = chatIdSchema.safeParse(chatId)
  if (!id.success) notFound()
  const user = await requireUser()
  const chat = await findChat(user.id, id.data)
  if (!chat) notFound()
  return chat
})

export async function generateMetadata({
  params,
}: PageProps<"/chats/[chatId]">): Promise<Metadata> {
  const chat = await loadChat((await params).chatId)
  return { title: `${chat.title} · Ace` }
}

export default async function ChatPage({
  params,
}: PageProps<"/chats/[chatId]">) {
  const chat = await loadChat((await params).chatId)
  const user = await requireUser()
  const [session, providerKeys] = await Promise.all([
    chat.messages.length > 0
      ? chatRuntime.accessToken(chat.id).then((publicAccessToken) => ({
          publicAccessToken,
          lastEventId: chat.cursors?.lastOutEventId,
        }))
      : undefined,
    listProviderKeyModels(user.id),
  ])

  return (
    <ChatView
      key={chat.id}
      chatId={chat.id}
      title={chat.title}
      teammates={chat.bots.map((bot) => ({
        id: bot.id,
        name: bot.name,
        picture: teammatePictureUrl(bot),
        connected: bot.connected,
        fullAuto: bot.fullAuto,
        model: bot.model,
      }))}
      lastBotId={chat.lastBotId}
      controlBotId={chat.controlBotId}
      initialMessages={chat.messages}
      session={session}
      providerKeys={providerKeys}
    />
  )
}
