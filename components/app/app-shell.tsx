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
import { AppSidebar } from "./app-sidebar"

export function AppShell({
  user,
  children,
}: {
  user: AuthUser
  children: React.ReactNode
}) {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div className="flex min-h-svh bg-bg text-ink">
      <div className="sticky top-0 hidden h-dvh shrink-0 sidebar:flex">
        <AppSidebar user={user} />
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-10 flex items-center gap-2.5 border-b border-line bg-bg py-2 pr-3 pl-1.5 sidebar:hidden">
          <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
            <SheetTrigger
              render={<Button variant="ghost" size="icon" aria-label="Menu" />}
            >
              <ListIcon weight="duotone" />
            </SheetTrigger>
            <SheetContent>
              <SheetTitle className="sr-only">Menu</SheetTitle>
              <AppSidebar user={user} onNavigate={() => setMenuOpen(false)} />
            </SheetContent>
          </Sheet>
          <Wordmark />
        </header>
        <main className="flex min-w-0 flex-1 flex-col">{children}</main>
      </div>
    </div>
  )
}
