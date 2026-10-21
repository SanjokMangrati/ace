import { cookies } from "next/headers"
import { AppShell } from "@/components/app/app-shell"
import { requireUser } from "@/server/session"
import { listSidebarChats } from "@/server/sidebar-chats"

export default async function AppLayout({ children, modal }: LayoutProps<"/">) {
  const user = await requireUser()
  const chats = await listSidebarChats(user.id)
  const sidebar = (await cookies()).get("sidebar")?.value

  return (
    <AppShell
      user={user}
      sidebarCollapsed={sidebar === "collapsed"}
      chats={chats}
    >
      {children}
      {modal}
    </AppShell>
  )
}
