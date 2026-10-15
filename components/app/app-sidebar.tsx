"use client"

import {
  PlugsConnectedIcon,
  SignOutIcon,
  UsersThreeIcon,
} from "@phosphor-icons/react/ssr"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useTransition } from "react"
import { authClient } from "@/components/auth/auth-client"
import { Wordmark } from "@/components/brand/wordmark"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Tile } from "@/components/ui/tile"
import { cn } from "@/lib/utils"
import type { AuthUser } from "@/server/ports/auth"

const links = [
  {
    href: "/teammates",
    label: "Teammates",
    color: "grape",
    Icon: UsersThreeIcon,
  },
  {
    href: "/providers",
    label: "AI providers",
    color: "lime",
    Icon: PlugsConnectedIcon,
  },
] as const

export function AppSidebar({
  user,
  onNavigate,
  className,
}: {
  user: AuthUser
  onNavigate?: () => void
  className?: string
}) {
  const pathname = usePathname()
  const [signingOut, startSignOut] = useTransition()

  function signOut() {
    startSignOut(async () => {
      await authClient.signOut()
      window.location.replace("/sign-in")
    })
  }

  return (
    <nav
      aria-label="Ace"
      className={cn(
        "flex h-full w-sidebar max-w-full flex-col gap-0.5 overflow-y-auto border-r border-line bg-sidebar px-2.5 py-3.5",
        className
      )}
    >
      <div className="flex items-center justify-between pr-1 pb-3 pl-2">
        <Link href="/" onClick={onNavigate} aria-label="Ace home">
          <Wordmark />
        </Link>
      </div>
      {links.map(({ href, label, color, Icon }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`)
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex min-h-control items-center gap-2.5 rounded-sm px-2.5 py-1.5 text-small text-ink-2 transition duration-150 ease-out hover:bg-fill hover:text-ink",
              active && "bg-sun-soft text-ink hover:bg-sun-soft"
            )}
          >
            <Tile size="xs" color={color}>
              <Icon weight="duotone" />
            </Tile>
            <span className="min-w-0 flex-1 truncate">{label}</span>
          </Link>
        )
      })}
      <div className="px-2.5 pt-4.5 pb-1.5 font-display text-caption font-medium text-ink-3">
        Chats
      </div>
      <p className="px-2.5 py-1 text-small text-ink-3">
        Your chats show up here.
      </p>
      <div className="min-h-6 flex-1" />
      <div className="mt-2 flex items-center gap-2.5 border-t border-line pt-2.5 pr-1.5 pl-2">
        <Avatar kind="you" size="sm" role="img" aria-label="You">
          {user.image && <AvatarImage src={user.image} alt="" />}
          <AvatarFallback>{user.name.charAt(0).toUpperCase()}</AvatarFallback>
        </Avatar>
        <span className="min-w-0 flex-1 text-small">
          <span className="block truncate">{user.name}</span>
          <span className="block truncate text-caption text-ink-3">
            {user.email}
          </span>
        </span>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Sign out"
          disabled={signingOut}
          onClick={signOut}
        >
          <SignOutIcon weight="duotone" />
        </Button>
      </div>
    </nav>
  )
}
