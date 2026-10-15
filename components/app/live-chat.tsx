"use client"

import { createContext, useContext, useEffect, useState } from "react"

type LiveChat = { id: string; working: boolean } | null

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

export function useReportLiveChat(id: string, working: boolean) {
  const { setLive } = useContext(LiveChatContext)
  useEffect(() => {
    setLive({ id, working })
    return () => setLive(null)
  }, [id, working, setLive])
}
