import { AppShell } from "@/components/app/app-shell"
import { teammatePictureUrl } from "@/lib/format"
import { listChats } from "@/server/db/queries/chats"
import { requireUser } from "@/server/session"

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const user = await requireUser()
  const chats = await listChats(user.id)

  return (
    <AppShell
      user={user}
      chats={chats.map((chat) => ({
        id: chat.id,
        title: chat.title,
        updatedAt: chat.updatedAt,
        working: chat.working,
        teammate: {
          id: chat.bot.id,
          name: chat.bot.name,
          picture: teammatePictureUrl(chat.bot),
        },
      }))}
    >
      {children}
    </AppShell>
  )
}
