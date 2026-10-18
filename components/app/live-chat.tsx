"use client"

import { useRouter } from "next/navigation"
import {
  createContext,
  type Dispatch,
  type SetStateAction,
  useCallback,
  useContext,
  useEffect,
  useEffectEvent,
  useState,
} from "react"
import { chatStatuses } from "@/app/(app)/chats/actions"

export type LiveStatus = {
  working: boolean
  queued: boolean
  needsYou: boolean
}

type LiveChats = Record<string, LiveStatus>

const STATUS_CHECK_MS = 5000

const LiveChatContext = createContext<{
  live: LiveChats
  setLive: Dispatch<SetStateAction<LiveChats>>
}>({ live: {}, setLive: () => {} })

function without(live: LiveChats, id: string) {
  const { [id]: _gone, ...rest } = live
  return rest
}

export function LiveChatProvider({ children }: { children: React.ReactNode }) {
  const [live, setLive] = useState<LiveChats>({})
  return <LiveChatContext value={{ live, setLive }}>{children}</LiveChatContext>
}

export function useLiveChats() {
  return useContext(LiveChatContext).live
}

export function useForgetLiveChat() {
  const { setLive } = useContext(LiveChatContext)
  return useCallback(
    (id: string) => setLive((live) => without(live, id)),
    [setLive]
  )
}

export function useReportLiveChat(
  id: string,
  { working, queued, needsYou }: LiveStatus
) {
  const { setLive } = useContext(LiveChatContext)
  useEffect(() => {
    setLive((live) => ({ ...live, [id]: { working, queued, needsYou } }))
  }, [id, working, queued, needsYou, setLive])
  useEffect(
    () => () =>
      setLive((live) =>
        live[id]?.working || live[id]?.queued ? live : without(live, id)
      ),
    [id, setLive]
  )
}

function sameStatus(a: LiveStatus, b: LiveStatus) {
  return (
    a.working === b.working &&
    a.queued === b.queued &&
    a.needsYou === b.needsYou
  )
}

export function ChatStatusSync({
  chats,
}: {
  chats: (LiveStatus & { id: string })[]
}) {
  const router = useRouter()
  const live = useLiveChats()
  const busy = chats.filter(
    (chat) => !live[chat.id] && (chat.working || chat.queued)
  )
  const busyIds = busy.map((chat) => chat.id).join()

  const check = useEffectEvent(async () => {
    const statuses = await chatStatuses(busy.map((chat) => chat.id))
    const changed = busy.some((chat) => {
      const now = statuses.find((status) => status.id === chat.id)
      return !now || !sameStatus(now, chat)
    })
    if (changed) router.refresh()
  })

  useEffect(() => {
    if (!busyIds) return
    const timer = setInterval(check, STATUS_CHECK_MS)
    return () => clearInterval(timer)
  }, [busyIds])

  return null
}
