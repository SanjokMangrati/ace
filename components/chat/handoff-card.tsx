"use client"

import { ArrowRightIcon } from "@phosphor-icons/react/ssr"
import { useState } from "react"
import { TeammateAvatar } from "@/components/ui/avatar"
import { textLinkClass } from "@/components/ui/text-link"
import type { HandoffEvent } from "@/lib/chat"
import { cn } from "@/lib/utils"
import type { ChatTeammate } from "./chat-message"

const SHORT_NOTE_CHARS = 240

export function HandoffCard({
  handoff,
  from,
  to,
}: {
  handoff: HandoffEvent
  from: ChatTeammate
  to: ChatTeammate
}) {
  const [open, setOpen] = useState(false)
  const long =
    handoff.summary.length + handoff.nextStep.length > SHORT_NOTE_CHARS

  return (
    <div className="flex flex-col gap-2.5 rounded-md border-1.5 border-dashed border-line-strong px-4 py-3.5">
      <p className="flex flex-wrap items-center gap-2 text-ink-2">
        <TeammateAvatar
          botId={from.id}
          name={from.name}
          picture={from.picture}
          size="sm"
        />
        <ArrowRightIcon weight="duotone" className="size-4 shrink-0" />
        <TeammateAvatar
          botId={to.id}
          name={to.name}
          picture={to.picture}
          size="sm"
        />
        <span>
          <b className="font-display text-name-lg text-ink">{from.name}</b>{" "}
          passed this to{" "}
          <b className="font-display text-name-lg text-ink">{to.name}</b>
        </span>
      </p>
      <blockquote
        className={cn(
          "border-l-3 border-sun pl-3 text-prose text-ink",
          long && !open && "line-clamp-3"
        )}
      >
        {handoff.summary} {handoff.nextStep}
      </blockquote>
      {long && !open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={cn(
            textLinkClass,
            "cursor-pointer self-start text-body text-ink-2"
          )}
        >
          Show more
        </button>
      )}
    </div>
  )
}
