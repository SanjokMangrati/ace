import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { cache } from "react"
import { ChatView } from "@/components/chat/chat-view"
import { chatIdSchema } from "@/lib/chat-schemas"
import { teammatePictureUrl } from "@/lib/format"
import { chatRuntime } from "@/server/container"
import { findChat } from "@/server/db/queries/chats"
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
  const session =
    chat.messages.length > 0
      ? {
          publicAccessToken: await chatRuntime.accessToken(chat.id),
          lastEventId: chat.cursors?.lastOutEventId,
        }
      : undefined

  return (
    <ChatView
      key={chat.id}
      chatId={chat.id}
      title={chat.title}
      teammate={{
        id: chat.bot.id,
        name: chat.bot.name,
        picture: teammatePictureUrl(chat.bot),
        connected: chat.bot.connected,
      }}
      initialMessages={chat.messages}
      session={session}
      inControl={chat.control === "user"}
    />
  )
}
