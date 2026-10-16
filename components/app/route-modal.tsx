"use client"

import { usePathname, useRouter } from "next/navigation"
import { createContext, useContext, useEffect, useRef, useState } from "react"
import { Dialog, DialogContent } from "@/components/ui/dialog"

const HistoryContext = createContext<{ current: boolean }>({ current: false })
const ModalContext = createContext<() => void>(() => {})

export function ModalHistoryProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const [firstPathname] = useState(pathname)
  const navigated = useRef(false)

  useEffect(() => {
    if (pathname !== firstPathname) navigated.current = true
  }, [pathname, firstPathname])

  return <HistoryContext value={navigated}>{children}</HistoryContext>
}

export function RouteModal({
  fallback,
  className,
  children,
}: {
  fallback: string
  className?: string
  children: React.ReactNode
}) {
  const router = useRouter()
  const navigated = useContext(HistoryContext)
  const [open, setOpen] = useState(true)

  function leave() {
    if (navigated.current) router.back()
    else router.replace(fallback)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={setOpen}
      onOpenChangeComplete={(isOpen) => {
        if (!isOpen) leave()
      }}
    >
      <DialogContent className={className}>
        <ModalContext value={() => setOpen(false)}>{children}</ModalContext>
      </DialogContent>
    </Dialog>
  )
}

export function useCloseModal() {
  return useContext(ModalContext)
}
