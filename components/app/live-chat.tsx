"use client"

import { createContext, useContext, useEffect, useState } from "react"

export type LiveStatus = {
  working: boolean
  queued: boolean
  needsYou: boolean
}

type LiveChat = (LiveStatus & { id: string }) | null

const LiveChatContext = createContext<{
  live: LiveChat
  setLive: (live: LiveChat) => void
}>({ live: null, setLive: () => {} })

export function LiveChatProvider({ children }: { children: React.ReactNode }) {
  const [live, setLive] = useState<LiveChat>(null)
  return <LiveChatContext value={{ live, setLive }}>{children}</LiveChatContext>
}

export function useLiveChat() {
  return useContext(LiveChatContext).live
}

export function useReportLiveChat(
  id: string,
  { working, queued, needsYou }: LiveStatus
) {
  const { setLive } = useContext(LiveChatContext)
  useEffect(() => {
    setLive({ id, working, queued, needsYou })
    return () => setLive(null)
  }, [id, working, queued, needsYou, setLive])
}
