import "server-only"
import type { SidebarChatPage } from "@/lib/chat"
import type { ChatCursor } from "@/lib/chat-schemas"
import { teammatePictureUrl } from "@/lib/format"
import { listChats } from "@/server/db/queries/chats"

export async function listSidebarChats(
  userId: string,
  after?: ChatCursor
): Promise<SidebarChatPage> {
  const { chats, hasMore } = await listChats(userId, after)
  return {
    hasMore,
    chats: chats.map((chat) => ({
      id: chat.id,
      title: chat.title,
      updatedAt: chat.updatedAt,
      working: chat.working,
      queued: chat.queued,
      needsYou: chat.needsYou,
      inControl: chat.inControl,
      teammates: chat.bots.map((bot) => ({
        id: bot.id,
        name: bot.name,
        picture: teammatePictureUrl(bot),
      })),
    })),
  }
}
