"use client"

import { ListIcon } from "@phosphor-icons/react/ssr"
import { useState } from "react"
import { Wordmark } from "@/components/brand/wordmark"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { TooltipProvider } from "@/components/ui/tooltip"
import { DAY_MS } from "@/lib/format"
import type { AuthUser } from "@/server/ports/auth"
import { AppSidebar, type SidebarChat } from "./app-sidebar"
import { ChatStatusSync, LiveChatProvider } from "./live-chat"
import { ModalHistoryProvider } from "./route-modal"

export function AppShell({
  user,
  chats,
  sidebarCollapsed,
  children,
}: {
  user: AuthUser
  chats: SidebarChat[]
  sidebarCollapsed: boolean
  children: React.ReactNode
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(sidebarCollapsed)

  function collapseSidebar(next: boolean) {
    setCollapsed(next)
    cookieStore.set({
      name: "sidebar",
      value: next ? "collapsed" : "open",
      path: "/",
      expires: Date.now() + 365 * DAY_MS,
    })
  }

  return (
    <LiveChatProvider>
      <ChatStatusSync chats={chats} />
      <TooltipProvider>
        <ModalHistoryProvider>
          <div className="flex h-dvh bg-bg text-ink">
            <div className="hidden h-full shrink-0 sidebar:flex">
              <AppSidebar
                user={user}
                chats={chats}
                collapsed={collapsed}
                onCollapse={() => collapseSidebar(true)}
                onExpand={() => collapseSidebar(false)}
              />
            </div>
            <div className="flex min-w-0 flex-1 flex-col">
              <header className="flex items-center gap-2.5 border-b border-line bg-bg py-2 pr-3 pl-1.5 sidebar:hidden">
                <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
                  <SheetTrigger
                    render={
                      <Button variant="ghost" size="icon" aria-label="Menu" />
                    }
                  >
                    <ListIcon weight="regular" />
                  </SheetTrigger>
                  <SheetContent>
                    <SheetTitle className="sr-only">Menu</SheetTitle>
                    <AppSidebar
                      user={user}
                      chats={chats}
                      onNavigate={() => setMenuOpen(false)}
                    />
                  </SheetContent>
                </Sheet>
                <Wordmark />
              </header>
              <main className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-x-hidden overflow-y-auto scrollbar-main">
                {children}
              </main>
            </div>
          </div>
        </ModalHistoryProvider>
      </TooltipProvider>
    </LiveChatProvider>
  )
}
