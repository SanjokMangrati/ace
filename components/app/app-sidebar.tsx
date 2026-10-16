"use client"

import {
  ChatsCircleIcon,
  DotsThreeIcon,
  NotePencilIcon,
  PlugsConnectedIcon,
  SidebarSimpleIcon,
  SignOutIcon,
  TrashIcon,
  UsersThreeIcon,
} from "@phosphor-icons/react/ssr"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState, useTransition } from "react"
import { authClient } from "@/components/auth/auth-client"
import { Wordmark } from "@/components/brand/wordmark"
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  TeammateAvatar,
} from "@/components/ui/avatar"
import { Button, buttonVariants } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuLinkItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { StatusDot } from "@/components/ui/status"
import { Tile } from "@/components/ui/tile"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { chatTime } from "@/lib/format"
import { cn } from "@/lib/utils"
import type { AuthUser } from "@/server/ports/auth"
import { DeleteChatDialog } from "./delete-chat"
import { useLiveChat } from "./live-chat"

export type SidebarChat = {
  id: string
  title: string
  updatedAt: Date
  working: boolean
  inControl: boolean
  teammate: { id: string; name: string; picture: string | null }
}

const rowClasses =
  "flex items-center gap-2.5 rounded-sm px-2.5 text-small text-ink-2 transition duration-150 ease-out hover:bg-fill hover:text-ink aria-[current=page]:bg-sun-soft aria-[current=page]:text-ink aria-[current=page]:hover:bg-sun-soft"

const railClasses =
  "grid size-control cursor-pointer place-items-center rounded-sm text-ink-2 transition duration-150 ease-out hover:bg-fill hover:text-ink aria-[current=page]:bg-sun-soft aria-[current=page]:text-ink data-popup-open:bg-fill"

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

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`)
}

function useSignOut() {
  const [signingOut, startSignOut] = useTransition()

  function signOut() {
    startSignOut(async () => {
      await authClient.signOut()
      window.location.replace("/sign-in")
    })
  }

  return { signingOut, signOut }
}

function YouAvatar({ user }: { user: AuthUser }) {
  return (
    <Avatar kind="you" size="sm" role="img" aria-label="You">
      {user.image && <AvatarImage src={user.image} alt="" />}
      <AvatarFallback>{user.name.charAt(0).toUpperCase()}</AvatarFallback>
    </Avatar>
  )
}

function ChatStatus({
  chat,
  working,
}: {
  chat: SidebarChat
  working: boolean
}) {
  if (chat.inControl) {
    return (
      <span className="inline-flex items-center gap-1.5 text-caption font-medium text-control">
        <StatusDot tone="control" className="size-1.75" />
        You're in control
      </span>
    )
  }
  if (working) {
    return (
      <span className="inline-flex items-center gap-1.5 text-caption font-medium text-working">
        <StatusDot tone="working" className="size-1.75" />
        Working
      </span>
    )
  }
  return (
    <time
      dateTime={chat.updatedAt.toISOString()}
      suppressHydrationWarning
      className="text-caption text-ink-3 group-aria-[current=page]/row:text-ink-2"
    >
      {chatTime(chat.updatedAt)}
    </time>
  )
}

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
  const [deleting, setDeleting] = useState(false)

  return (
    <div className="group/chat relative">
      <Link
        href={`/chats/${chat.id}`}
        onClick={onNavigate}
        aria-current={active ? "page" : undefined}
        className={cn(
          rowClasses,
          "group/row min-h-12 py-1.75 group-hover/chat:pr-11 group-has-data-popup-open/chat:pr-11 pointer-coarse:pr-11",
          active && "pr-11"
        )}
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
          <ChatStatus chat={chat} working={working} />
        </span>
      </Link>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={`Options for ${chat.title}`}
              className={cn(
                "absolute top-1/2 right-1.5 -translate-y-1/2 opacity-0 group-hover/chat:opacity-100 focus-visible:opacity-100 data-popup-open:opacity-100 pointer-coarse:opacity-100",
                active && "opacity-100"
              )}
            />
          }
        >
          <DotsThreeIcon weight="regular" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem variant="danger" onClick={() => setDeleting(true)}>
            <TrashIcon weight="duotone" />
            Delete chat
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <DeleteChatDialog
        chatId={chat.id}
        title={chat.title}
        teammateName={chat.teammate.name}
        active={active}
        open={deleting}
        onOpenChange={setDeleting}
      />
    </div>
  )
}

function RailTooltip({
  label,
  trigger,
  children,
}: {
  label: string
  trigger: React.ReactElement<Record<string, unknown>>
  children: React.ReactNode
}) {
  return (
    <Tooltip>
      <TooltipTrigger render={trigger}>{children}</TooltipTrigger>
      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
  )
}

function SidebarRail({
  user,
  chats,
  onExpand,
}: {
  user: AuthUser
  chats: SidebarChat[]
  onExpand: () => void
}) {
  const pathname = usePathname()
  const live = useLiveChat()
  const { signingOut, signOut } = useSignOut()
  const chatOpen = chats.some((chat) => pathname === `/chats/${chat.id}`)

  return (
    <nav
      aria-label="Ace"
      className="flex h-full w-15 flex-col items-center gap-1 border-r border-line bg-sidebar px-2.5 py-3.5"
    >
      <RailTooltip
        label="Show sidebar"
        trigger={
          <Button
            variant="ghost"
            size="icon"
            aria-label="Show sidebar"
            onClick={onExpand}
            className="mb-2"
          />
        }
      >
        <SidebarSimpleIcon weight="duotone" />
      </RailTooltip>
      <RailTooltip
        label="New chat"
        trigger={
          <Link
            href="/chats/new"
            aria-label="New chat"
            aria-current={pathname === "/chats/new" ? "page" : undefined}
            className={buttonVariants({ size: "icon", className: "mb-2" })}
          />
        }
      >
        <NotePencilIcon weight="duotone" />
      </RailTooltip>
      {links.map(({ href, label, color, Icon }) => (
        <RailTooltip
          key={href}
          label={label}
          trigger={
            <Link
              href={href}
              aria-label={label}
              aria-current={isActive(pathname, href) ? "page" : undefined}
              className={railClasses}
            />
          }
        >
          <Tile size="xs" color={color}>
            <Icon weight="duotone" />
          </Tile>
        </RailTooltip>
      ))}
      <DropdownMenu>
        <DropdownMenuTrigger
          openOnHover
          delay={0}
          aria-label="Chats"
          aria-current={chatOpen ? "page" : undefined}
          className={railClasses}
        >
          <ChatsCircleIcon weight="duotone" className="size-5" />
        </DropdownMenuTrigger>
        <DropdownMenuContent side="right" align="start" className="w-72">
          <DropdownMenuGroup>
            <DropdownMenuLabel>Chats</DropdownMenuLabel>
            {chats.length > 0 ? (
              chats.map((chat) => (
                <DropdownMenuLinkItem
                  key={chat.id}
                  render={<Link href={`/chats/${chat.id}`} />}
                  aria-current={
                    pathname === `/chats/${chat.id}` ? "page" : undefined
                  }
                  className="group/row min-h-12 aria-[current=page]:bg-sun-soft"
                >
                  <TeammateAvatar
                    botId={chat.teammate.id}
                    name={chat.teammate.name}
                    picture={chat.teammate.picture}
                    size="xs"
                  />
                  <span className="flex min-w-0 flex-1 flex-col gap-px">
                    <span className="truncate text-small">{chat.title}</span>
                    <ChatStatus
                      chat={chat}
                      working={
                        live?.id === chat.id ? live.working : chat.working
                      }
                    />
                  </span>
                </DropdownMenuLinkItem>
              ))
            ) : (
              <p className="px-2.5 py-1.5 text-small text-ink-3">
                Your chats show up here.
              </p>
            )}
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
      <div className="min-h-6 flex-1" />
      <DropdownMenu>
        <RailTooltip
          label="Account"
          trigger={
            <DropdownMenuTrigger aria-label="Account" className={railClasses} />
          }
        >
          <YouAvatar user={user} />
        </RailTooltip>
        <DropdownMenuContent side="right" align="end" className="w-64">
          <DropdownMenuGroup>
            <DropdownMenuLabel className="flex flex-col">
              <span className="truncate text-ink">{user.name}</span>
              <span className="truncate text-caption">{user.email}</span>
            </DropdownMenuLabel>
            <DropdownMenuItem disabled={signingOut} onClick={signOut}>
              <SignOutIcon weight="regular" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </nav>
  )
}

export function AppSidebar({
  user,
  chats,
  collapsed,
  onNavigate,
  onCollapse,
  onExpand,
}: {
  user: AuthUser
  chats: SidebarChat[]
  collapsed?: boolean
  onNavigate?: () => void
  onCollapse?: () => void
  onExpand?: () => void
}) {
  const pathname = usePathname()
  const live = useLiveChat()
  const { signingOut, signOut } = useSignOut()

  if (collapsed && onExpand) {
    return <SidebarRail user={user} chats={chats} onExpand={onExpand} />
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
        {onCollapse && (
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Hide sidebar"
            onClick={onCollapse}
          >
            <SidebarSimpleIcon weight="duotone" />
          </Button>
        )}
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
      {links.map(({ href, label, color, Icon }) => (
        <Link
          key={href}
          href={href}
          onClick={onNavigate}
          aria-current={isActive(pathname, href) ? "page" : undefined}
          className={cn(rowClasses, "min-h-control py-1.5")}
        >
          <Tile size="xs" color={color}>
            <Icon weight="duotone" />
          </Tile>
          <span className="min-w-0 flex-1 truncate">{label}</span>
        </Link>
      ))}
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
        <YouAvatar user={user} />
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
          <SignOutIcon weight="regular" />
        </Button>
      </div>
    </nav>
  )
}
