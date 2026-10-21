"use client"

import {
  useEffect,
  useEffectEvent,
  useRef,
  useState,
  useTransition,
} from "react"
import { loadMoreChats } from "@/app/(app)/chats/actions"
import { Spinner } from "@/components/ui/spinner"
import { callAction } from "@/lib/action-client"
import type { SidebarChat, SidebarChatPage } from "@/lib/chat"

export type ChatPages = {
  chats: SidebarChat[]
  hasMore: boolean
  loading: boolean
  loadMore: () => void
  forget: (id: string) => void
}

function isOlder(chat: SidebarChat, than: SidebarChat) {
  const gap = chat.updatedAt.getTime() - than.updatedAt.getTime()
  return gap < 0 || (gap === 0 && chat.id < than.id)
}

function pastFirstPage(older: SidebarChat[], first: SidebarChat[]) {
  const edge = first.at(-1)
  if (!edge) return []
  const shown = new Set(first.map((chat) => chat.id))
  return older.filter((chat) => !shown.has(chat.id) && isOlder(chat, edge))
}

export function useChatPages(first: SidebarChatPage): ChatPages {
  const [older, setOlder] = useState<SidebarChat[]>([])
  const [loadedAll, setLoadedAll] = useState(false)
  const [loading, startLoading] = useTransition()
  const chats = first.hasMore
    ? [...first.chats, ...pastFirstPage(older, first.chats)]
    : first.chats
  const hasMore = first.hasMore && !loadedAll

  function loadMore() {
    const last = chats.at(-1)
    if (!last || !hasMore || loading) return
    startLoading(async () => {
      const page = await callAction(() =>
        loadMoreChats({ updatedAt: last.updatedAt, id: last.id })
      )
      if (!page.ok) return
      setOlder((current) => {
        const known = new Set(current.map((chat) => chat.id))
        return [...current, ...page.chats.filter((chat) => !known.has(chat.id))]
      })
      if (!page.hasMore) setLoadedAll(true)
    })
  }

  function forget(id: string) {
    setOlder((current) => current.filter((chat) => chat.id !== id))
  }

  return { chats, hasMore, loading, loadMore, forget }
}

export function LoadMoreChats({ pages }: { pages: ChatPages }) {
  const ref = useRef<HTMLDivElement>(null)
  const load = useEffectEvent(pages.loadMore)

  useEffect(() => {
    const node = ref.current
    if (!node) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) load()
      },
      { rootMargin: "120px" }
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  return (
    <div ref={ref} className="flex min-h-8 items-center justify-center">
      {pages.loading && (
        <Spinner aria-label="Loading chats" className="size-4 text-ink-3" />
      )}
    </div>
  )
}
