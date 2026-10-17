"use client"

import {
  ArrowCounterClockwiseIcon,
  ArrowsInIcon,
  ArrowsOutIcon,
  HandPalmIcon,
  PauseIcon,
  XIcon,
} from "@phosphor-icons/react/ssr"
import { useEffect, useState } from "react"
import {
  giveBackControlOfScreen,
  openScreen,
  takeControlOfScreen,
} from "@/app/(app)/chats/actions"
import { ErrorNotice } from "@/components/app/error-notice"
import { TeammateAvatar } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { Status } from "@/components/ui/status"
import { callAction, useAction } from "@/lib/action-client"
import type { ControlEvent } from "@/lib/chat"
import { cn } from "@/lib/utils"
import { SCREEN } from "@/server/ports/computer"
import type { ChatTeammate } from "./chat-message"

function fitScreen(frame: HTMLDivElement) {
  const stage = frame.parentElement
  const section = frame.closest("section")
  const bounds = section?.parentElement
  if (!stage || !section || !bounds) return
  const observer = new ResizeObserver(() => {
    const { paddingLeft, paddingRight } = getComputedStyle(stage)
    const width =
      bounds.clientWidth - parseFloat(paddingLeft) - parseFloat(paddingRight)
    const height =
      bounds.clientHeight - (section.offsetHeight - frame.offsetHeight)
    const crisp = Math.max(1, Math.floor(devicePixelRatio)) / devicePixelRatio
    const scale = Math.max(
      0,
      Math.min(crisp, width / SCREEN.width, height / SCREEN.height)
    )
    bounds.style.setProperty("--screen-scale", String(scale))
    bounds.style.setProperty("--screen-width", `${SCREEN.width * scale}px`)
  })
  observer.observe(bounds)
  observer.observe(section)
  return () => observer.disconnect()
}

function LiveScreen({
  chatId,
  name,
  onRetry,
}: {
  chatId: string
  name: string
  onRetry: () => void
}) {
  const [screen, setScreen] = useState<{ url: string } | "loading" | "failed">(
    "loading"
  )
  useEffect(() => {
    let active = true
    callAction(() => openScreen(chatId)).then((result) => {
      if (active) setScreen(result.ok ? { url: result.url } : "failed")
    })
    return () => {
      active = false
    }
  }, [chatId])

  if (screen === "failed") {
    return (
      <ErrorNotice
        message={`${name}'s screen didn't open. Try again in a moment.`}
        className="rounded-none"
      >
        <Button variant="secondary" size="sm" onClick={onRetry}>
          Try again
        </Button>
      </ErrorNotice>
    )
  }

  return (
    <div className="grid place-items-center bg-screen p-3">
      <div
        ref={fitScreen}
        className="relative grid aspect-16/10 w-(--screen-width) place-items-center overflow-hidden rounded-xs"
      >
        {screen === "loading" ? (
          <Spinner
            aria-label={`Starting ${name}'s computer`}
            className="size-5 text-ink-3"
          />
        ) : (
          <iframe
            src={screen.url}
            title={`${name}'s screen`}
            sandbox="allow-scripts allow-same-origin allow-forms"
            referrerPolicy="no-referrer"
            scrolling="no"
            className="absolute top-0 left-0 h-200 w-320 origin-top-left scale-(--screen-scale)"
          />
        )}
      </div>
    </div>
  )
}

export function ScreenPanel({
  chatId,
  teammate,
  inControl,
  working,
  expanded,
  onHandedBack,
  onToggleSize,
  onClose,
}: {
  chatId: string
  teammate: ChatTeammate
  inControl: boolean
  working: boolean
  expanded: boolean
  onHandedBack: (control: ControlEvent) => void
  onToggleSize?: () => void
  onClose: () => void
}) {
  const [attempt, setAttempt] = useState(0)
  const { pending, error, run } = useAction()
  const name = teammate.name

  function giveBack() {
    run(async () => {
      const result = await giveBackControlOfScreen(chatId)
      if (result.control && !working) onHandedBack(result.control)
      return result
    })
  }

  return (
    <div className={cn("h-full", expanded && "fixed inset-0 z-50 bg-bg p-4")}>
      <div
        className={cn(
          "flex h-full flex-col",
          expanded && "items-center justify-center"
        )}
      >
        <section
          aria-label={`${name}'s screen`}
          className={cn(
            "flex max-h-full flex-col overflow-hidden rounded-md bg-surface shadow-card",
            inControl && "ring-2 ring-control"
          )}
        >
          <div className="flex flex-wrap items-center gap-2.5 py-3 pr-3 pl-4">
            <span className="mr-auto inline-flex items-center gap-2.5 font-display text-name">
              <TeammateAvatar
                botId={teammate.id}
                name={name}
                picture={teammate.picture}
                size="sm"
              />
              {name}'s screen
            </span>
            {inControl ? (
              <Status tone="control">You're in control</Status>
            ) : (
              working && <Status tone="working">Working</Status>
            )}
            {inControl ? (
              <Button size="sm" disabled={pending} onClick={giveBack}>
                <ArrowCounterClockwiseIcon
                  weight="duotone"
                  data-icon="inline-start"
                />
                Give back control
              </Button>
            ) : (
              <Button
                variant="secondary"
                size="sm"
                disabled={pending}
                onClick={() => run(() => takeControlOfScreen(chatId))}
              >
                <HandPalmIcon weight="duotone" data-icon="inline-start" />
                Take control
              </Button>
            )}
            {onToggleSize ? (
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={expanded ? "Show smaller" : "Show full size"}
                onClick={onToggleSize}
              >
                {expanded ? (
                  <ArrowsInIcon weight="regular" />
                ) : (
                  <ArrowsOutIcon weight="regular" />
                )}
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Hide screen"
                onClick={onClose}
              >
                <XIcon weight="regular" />
              </Button>
            )}
          </div>
          {error && <ErrorNotice message={error} className="rounded-none" />}
          {inControl && (
            <div className="flex items-center gap-2.5 bg-control-soft px-4 py-2.5 text-small text-control">
              <PauseIcon weight="duotone" className="size-4.5 shrink-0" />
              You're in control. {name} is waiting.
            </div>
          )}
          <LiveScreen
            key={`${inControl}-${attempt}`}
            chatId={chatId}
            name={name}
            onRetry={() => setAttempt((value) => value + 1)}
          />
          <p className="px-4 py-2.5 text-caption text-ink-3">
            {inControl
              ? `Your clicks and typing go to ${name}'s screen. ${name} stays paused until you give back control.`
              : `Watching only. ${name} is using the screen.`}
          </p>
        </section>
      </div>
    </div>
  )
}
