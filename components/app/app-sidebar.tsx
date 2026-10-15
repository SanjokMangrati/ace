"use client"

import {
  NotePencilIcon,
  PlugsConnectedIcon,
  SignOutIcon,
  UsersThreeIcon,
} from "@phosphor-icons/react/ssr"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useTransition } from "react"
import { authClient } from "@/components/auth/auth-client"
import { Wordmark } from "@/components/brand/wordmark"
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  TeammateAvatar,
} from "@/components/ui/avatar"
import { Button, buttonVariants } from "@/components/ui/button"
import { StatusDot } from "@/components/ui/status"
import { Tile } from "@/components/ui/tile"
import { chatTime } from "@/lib/format"
import { cn } from "@/lib/utils"
import type { AuthUser } from "@/server/ports/auth"
import { useLiveChat } from "./live-chat"

export type SidebarChat = {
  id: string
  title: string
  updatedAt: Date
  working: boolean
  teammate: { id: string; name: string; picture: string | null }
}

const rowClasses =
  "flex items-center gap-2.5 rounded-sm px-2.5 text-small text-ink-2 transition duration-150 ease-out hover:bg-fill hover:text-ink aria-[current=page]:bg-sun-soft aria-[current=page]:text-ink aria-[current=page]:hover:bg-sun-soft"

function ChatRow({
  chat,
  active,
  working,
  onNavigate,
}: {
  chat: SidebarChat
  active: boolean
  working: boolean
  onNavigate?: () => void
}) {
  return (
    <Link
      href={`/chats/${chat.id}`}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(rowClasses, "group/row min-h-12 py-1.75")}
    >
      <span className="flex w-10 shrink-0">
        <TeammateAvatar
          botId={chat.teammate.id}
          name={chat.teammate.name}
          picture={chat.teammate.picture}
          size="xs"
        />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-px">
        <span className="truncate">{chat.title}</span>
        {working ? (
          <span className="inline-flex items-center gap-1.5 text-caption font-medium text-working">
            <StatusDot tone="working" className="size-1.75" />
            Working
          </span>
        ) : (
          <time
            dateTime={chat.updatedAt.toISOString()}
            suppressHydrationWarning
            className="text-caption text-ink-3 group-aria-[current=page]/row:text-ink-2"
          >
            {chatTime(chat.updatedAt)}
          </time>
        )}
      </span>
    </Link>
  )
}

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
  chats,
  onNavigate,
}: {
  user: AuthUser
  chats: SidebarChat[]
  onNavigate?: () => void
}) {
  const pathname = usePathname()
  const live = useLiveChat()
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
      className="flex h-full w-sidebar max-w-full flex-col gap-0.5 overflow-y-auto border-r border-line bg-sidebar px-2.5 py-3.5"
    >
      <div className="flex items-center justify-between pr-1 pb-3 pl-2">
        <Link href="/" onClick={onNavigate} aria-label="Ace home">
          <Wordmark />
        </Link>
      </div>
      <Link
        href="/chats/new"
        onClick={onNavigate}
        aria-current={pathname === "/chats/new" ? "page" : undefined}
        className={buttonVariants({ className: "mt-1 mb-2.5 w-full" })}
      >
        <NotePencilIcon weight="duotone" data-icon="inline-start" />
        New chat
      </Link>
      {links.map(({ href, label, color, Icon }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`)
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(rowClasses, "min-h-control py-1.5")}
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
      {chats.length > 0 ? (
        chats.map((chat) => (
          <ChatRow
            key={chat.id}
            chat={chat}
            active={pathname === `/chats/${chat.id}`}
            working={live?.id === chat.id ? live.working : chat.working}
            onNavigate={onNavigate}
          />
        ))
      ) : (
        <p className="px-2.5 py-1 text-small text-ink-3">
          Your chats show up here.
        </p>
      )}
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
