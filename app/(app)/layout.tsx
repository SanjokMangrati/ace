import { cookies } from "next/headers"
import { AppShell } from "@/components/app/app-shell"
import { teammatePictureUrl } from "@/lib/format"
import { listChats } from "@/server/db/queries/chats"
import { requireUser } from "@/server/session"

export default async function AppLayout({ children, modal }: LayoutProps<"/">) {
  const user = await requireUser()
  const chats = await listChats(user.id)
  const sidebar = (await cookies()).get("sidebar")?.value

  return (
    <AppShell
      user={user}
      sidebarCollapsed={sidebar === "collapsed"}
      chats={chats.map((chat) => ({
        id: chat.id,
        title: chat.title,
        updatedAt: chat.updatedAt,
        working: chat.working,
        queued: chat.queued,
        inControl: chat.inControl,
        teammate: {
          id: chat.bot.id,
          name: chat.bot.name,
          picture: teammatePictureUrl(chat.bot),
        },
      }))}
    >
      {children}
      {modal}
    </AppShell>
  )
}
