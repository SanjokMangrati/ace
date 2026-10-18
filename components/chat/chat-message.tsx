"use client"

import {
  ArrowCounterClockwiseIcon,
  HandPalmIcon,
} from "@phosphor-icons/react/ssr"
import { Fragment } from "react"
import {
  Message,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message"
import { TeammateAvatar } from "@/components/ui/avatar"
import { messageText, splitMentions, type TeammateMessage } from "@/lib/chat"
import { Activity } from "./activity"
import { HandoffCard } from "./handoff-card"
import { readMessage, type Segment } from "./message-parts"
import { PermissionCard } from "./permission-card"
import { Time } from "./time"
import { TurnNotice, UpNextNotice } from "./turn-notice"

export type ChatTeammate = {
  id: string
  name: string
  picture: string | null
  connected: boolean
  fullAuto: boolean
}

const EMPTY: Segment = { steps: [], text: "", asks: [] }

function ControlEvents({
  teammateName,
  tookAt,
  gaveAt,
}: {
  teammateName: string
  tookAt: number
  gaveAt?: number
}) {
  const events = [
    {
      Icon: HandPalmIcon,
      text: `You took control of ${teammateName}'s screen`,
      at: tookAt,
    },
  ]
  if (gaveAt !== undefined) {
    events.push({
      Icon: ArrowCounterClockwiseIcon,
      text: "You gave back control",
      at: gaveAt,
    })
  }
  return (
    <div className="flex flex-col gap-3">
      {events.map(({ Icon, text, at }) => (
        <p
          key={text}
          className="flex items-center justify-center gap-2 text-caption text-ink-3"
        >
          <Icon weight="duotone" className="size-4.5 shrink-0" />
          {text} · <Time at={at} />
        </p>
      ))}
    </div>
  )
}

export function YourMessage({
  message,
  teammates,
}: {
  message: TeammateMessage
  teammates: ChatTeammate[]
}) {
  const byId = (id: string | undefined) =>
    teammates.find((teammate) => teammate.id === id)
  const { control, handoff } = message.metadata ?? {}
  if (control) {
    return (
      <ControlEvents
        teammateName={(byId(control.botId) ?? teammates[0]).name}
        {...control}
      />
    )
  }
  const from = byId(handoff?.fromBotId)
  const to = byId(handoff?.toBotId)
  if (handoff && from && to) {
    return <HandoffCard handoff={handoff} from={from} to={to} />
  }
  const text = messageText(message)
  const pieces =
    teammates.length > 1
      ? splitMentions(text, teammates)
      : [{ at: 0, text, mention: false }]

  return (
    <Message from="user">
      <div className="flex max-w-5/6 flex-col items-end">
        <div className="max-w-140 rounded-lg rounded-br-xs bg-sun-soft px-4 py-3 text-prose wrap-break-word whitespace-pre-wrap text-ink">
          {pieces.map((piece) =>
            piece.mention ? (
              <b key={piece.at} className="font-semibold">
                {piece.text}
              </b>
            ) : (
              <Fragment key={piece.at}>{piece.text}</Fragment>
            )
          )}
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
  team,
  message,
  working,
  error,
  onKeepGoing,
  onAnswer,
}: {
  teammate: ChatTeammate
  team: ChatTeammate[]
  message: TeammateMessage | undefined
  working: boolean
  error?: string
  onKeepGoing?: () => void
  onAnswer?: (approvalId: string, approved: boolean) => void
}) {
  const { segments, notices, queue } = message
    ? readMessage(message, new Map(team.map((bot) => [bot.id, bot.name])))
    : { segments: [EMPTY], notices: [], queue: undefined }
  const upNext = working && queue?.startedAt === undefined ? queue : undefined
  if (error && !notices.some((notice) => notice.reason === "error")) {
    notices.push({ reason: "error", message: error })
  }
  const createdAt = message?.metadata?.createdAt
  const startedAt =
    segments.length > 1 ? message?.metadata?.resumedAt : createdAt
  const finishedAt = message?.metadata?.finishedAt
  const settingsHref = `/teammates/${teammate.id}`

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
        {upNext && <UpNextNotice queue={upNext} name={teammate.name} />}
        {segments.map((segment, index) => {
          const last = index === segments.length - 1
          const busy = last && working
          return (
            <Fragment key={segment.asks.at(-1)?.step.key ?? "rest"}>
              {!(last && upNext) && (busy || segment.steps.length > 0) && (
                <Activity
                  steps={segment.steps}
                  working={busy}
                  durationMs={
                    last && startedAt !== undefined && finishedAt !== undefined
                      ? finishedAt - startedAt
                      : undefined
                  }
                />
              )}
              {segment.text && (
                <MessageResponse isAnimating={busy}>
                  {segment.text}
                </MessageResponse>
              )}
              {segment.asks.map((ask) => (
                <PermissionCard
                  key={ask.step.key}
                  ask={ask}
                  name={teammate.name}
                  fullAuto={teammate.fullAuto}
                  settingsHref={settingsHref}
                  onAnswer={
                    onAnswer &&
                    ((approved) => onAnswer(ask.approvalId, approved))
                  }
                />
              ))}
            </Fragment>
          )
        })}
        {notices.map((notice) => (
          <TurnNotice
            key={notice.reason}
            notice={notice}
            name={teammate.name}
            settingsHref={settingsHref}
            onKeepGoing={onKeepGoing}
          />
        ))}
      </MessageContent>
    </Message>
  )
}
