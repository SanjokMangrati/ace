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
import type { AuthUser } from "@/server/ports/auth"
import { AppSidebar, type SidebarChat } from "./app-sidebar"
import { LiveChatProvider } from "./live-chat"

export function AppShell({
  user,
  chats,
  children,
}: {
  user: AuthUser
  chats: SidebarChat[]
  children: React.ReactNode
}) {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <LiveChatProvider>
      <div className="flex h-dvh bg-bg text-ink">
        <div className="hidden h-full shrink-0 sidebar:flex">
          <AppSidebar user={user} chats={chats} />
        </div>
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex items-center gap-2.5 border-b border-line bg-bg py-2 pr-3 pl-1.5 sidebar:hidden">
            <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
              <SheetTrigger
                render={
                  <Button variant="ghost" size="icon" aria-label="Menu" />
                }
              >
                <ListIcon weight="duotone" />
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
          <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto">
            {children}
          </main>
        </div>
      </div>
    </LiveChatProvider>
  )
}
