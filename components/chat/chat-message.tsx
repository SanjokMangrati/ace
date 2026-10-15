"use client"

import {
  Message,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message"
import { TeammateAvatar } from "@/components/ui/avatar"
import type { TeammateMessage } from "@/lib/chat"
import { clockTime } from "@/lib/format"
import { Activity } from "./activity"
import { readMessage } from "./message-parts"
import { TurnNotice } from "./turn-notice"

export type ChatTeammate = {
  id: string
  name: string
  picture: string | null
  connected: boolean
}

function Time({ at, className }: { at?: number; className?: string }) {
  if (at === undefined) return null
  const date = new Date(at)
  return (
    <time
      dateTime={date.toISOString()}
      suppressHydrationWarning
      className={className}
    >
      {clockTime(date)}
    </time>
  )
}

export function YourMessage({ message }: { message: TeammateMessage }) {
  const text = message.parts
    .map((part) => (part.type === "text" ? part.text : ""))
    .join("")

  return (
    <Message from="user">
      <div className="flex max-w-5/6 flex-col items-end">
        <div className="max-w-140 rounded-lg rounded-br-xs bg-sun-soft px-4 py-3 text-prose wrap-break-word whitespace-pre-wrap text-ink">
          {text}
        </div>
        <Time
          at={message.metadata?.createdAt}
          className="mt-1 text-caption text-ink-3"
        />
      </div>
    </Message>
  )
}

export function TeammateReply({
  teammate,
  message,
  working,
  error,
  onKeepGoing,
}: {
  teammate: ChatTeammate
  message: TeammateMessage | undefined
  working: boolean
  error?: string
  onKeepGoing?: () => void
}) {
  const { steps, text, notices } = message
    ? readMessage(message)
    : { steps: [], text: "", notices: [] }
  if (error && !notices.some((notice) => notice.reason === "error")) {
    notices.push({ reason: "error", message: error })
  }
  const createdAt = message?.metadata?.createdAt
  const finishedAt = message?.metadata?.finishedAt

  return (
    <Message from="assistant">
      <TeammateAvatar
        botId={teammate.id}
        name={teammate.name}
        picture={teammate.picture}
      />
      <MessageContent>
        <div className="flex items-baseline gap-2">
          <b className="font-display text-name">{teammate.name}</b>
          <Time at={createdAt} className="text-caption text-ink-3" />
        </div>
        {(working || steps.length > 0) && (
          <Activity
            steps={steps}
            working={working}
            durationMs={
              createdAt !== undefined && finishedAt !== undefined
                ? finishedAt - createdAt
                : undefined
            }
          />
        )}
        {text && (
          <MessageResponse isAnimating={working}>{text}</MessageResponse>
        )}
        {notices.map((notice) => (
          <TurnNotice
            key={notice.reason}
            notice={notice}
            name={teammate.name}
            settingsHref={`/teammates/${teammate.id}`}
            onKeepGoing={onKeepGoing}
          />
        ))}
      </MessageContent>
    </Message>
  )
}
