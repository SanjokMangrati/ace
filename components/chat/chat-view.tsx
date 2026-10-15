"use client"

import { useChat } from "@ai-sdk/react"
import { ArrowUpIcon, InfoIcon } from "@phosphor-icons/react/ssr"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useEffectEvent, useRef, useState } from "react"
import {
  Conversation,
  ConversationContent,
} from "@/components/ai-elements/conversation"
import { useReportLiveChat } from "@/components/app/live-chat"
import { Alert, AlertAction, AlertDescription } from "@/components/ui/alert"
import { TeammateAvatar } from "@/components/ui/avatar"
import { Button, buttonVariants } from "@/components/ui/button"
import {
  Composer,
  ComposerBar,
  ComposerHint,
  ComposerTextarea,
} from "@/components/ui/composer"
import { Status } from "@/components/ui/status"
import { SOMETHING_WENT_WRONG } from "@/lib/action-result"
import type { TeammateMessage } from "@/lib/chat"
import { type ChatTeammate, TeammateReply, YourMessage } from "./chat-message"
import { takePendingMessage } from "./pending-message"
import { type ChatSession, useChatTransport } from "./use-chat-transport"

export function ChatView({
  chatId,
  title,
  teammate,
  initialMessages,
  session,
}: {
  chatId: string
  title: string
  teammate: ChatTeammate
  initialMessages: TeammateMessage[]
  session: ChatSession | undefined
}) {
  const router = useRouter()
  const transport = useChatTransport(chatId, session)
  const [resume] = useState(initialMessages.length > 0)
  const [failures, setFailures] = useState<Record<string, string>>({})
  const lastFailure = useRef(SOMETHING_WENT_WRONG)
  const { messages, sendMessage, status, error } = useChat<TeammateMessage>({
    id: chatId,
    messages: initialMessages,
    transport,
    resume,
    onError: (failure) => {
      lastFailure.current = failure.message || SOMETHING_WENT_WRONG
    },
    onFinish: ({ message, isError }) => {
      if (isError && message.role === "assistant") {
        setFailures((current) => ({
          ...current,
          [message.id]: lastFailure.current,
        }))
      }
      router.refresh()
    },
  })
  const [draft, setDraft] = useState("")
  const working = status === "submitted" || status === "streaming"
  useReportLiveChat(chatId, working)

  function send(text: string) {
    sendMessage({ text, metadata: { createdAt: Date.now() } })
  }

  const sendPending = useEffectEvent(() => {
    const pending = takePendingMessage(chatId)
    if (pending) send(pending)
  })

  useEffect(() => {
    const timer = setTimeout(sendPending)
    return () => clearTimeout(timer)
  }, [])

  const last = messages.at(-1)

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="flex min-h-16 flex-wrap items-center gap-3 border-b border-line px-4 py-3 sm:px-6">
        <TeammateAvatar
          botId={teammate.id}
          name={teammate.name}
          picture={teammate.picture}
        />
        <div className="flex min-w-0 flex-1 flex-col">
          <h1 className="truncate font-display text-title">{title}</h1>
          <span className="text-caption text-ink-3">with {teammate.name}</span>
        </div>
        {working && <Status tone="working">Working</Status>}
      </header>

      <Conversation>
        <ConversationContent>
          {messages.map((message, index) =>
            message.role === "user" ? (
              <YourMessage key={message.id} message={message} />
            ) : (
              <TeammateReply
                key={message.id}
                teammate={teammate}
                message={message}
                working={working && index === messages.length - 1}
                error={failures[message.id]}
                onKeepGoing={
                  index === messages.length - 1 && !working
                    ? () => send("Keep going")
                    : undefined
                }
              />
            )
          )}
          {last?.role === "user" && (status === "submitted" || error) && (
            <TeammateReply
              teammate={teammate}
              message={undefined}
              working={status === "submitted"}
              error={error && (error.message || SOMETHING_WENT_WRONG)}
            />
          )}
        </ConversationContent>
      </Conversation>

      <div className="px-4 pb-5 sm:px-6">
        <div className="mx-auto flex max-w-thread flex-col gap-3">
          {!teammate.connected && (
            <Alert variant="needs-you">
              <InfoIcon weight="duotone" />
              <AlertDescription>
                {teammate.name} isn't connected to an AI provider yet.
              </AlertDescription>
              <AlertAction>
                <Link
                  href={`/teammates/${teammate.id}`}
                  className={buttonVariants({ size: "sm" })}
                >
                  Open {teammate.name}'s settings
                </Link>
              </AlertAction>
            </Alert>
          )}
          <form
            noValidate
            onSubmit={(event) => {
              event.preventDefault()
              const text = draft.trim()
              if (!text || working || !teammate.connected) return
              send(text)
              setDraft("")
            }}
          >
            <Composer>
              <ComposerTextarea
                rows={1}
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder={
                  messages.length > 0
                    ? `Reply to ${teammate.name}…`
                    : `Ask ${teammate.name} to do something…`
                }
                aria-label={`Message to ${teammate.name}`}
              />
              <ComposerBar>
                <ComposerHint>
                  {working &&
                    `${teammate.name} is working on this. You can reply when it's done.`}
                </ComposerHint>
                <Button
                  type="submit"
                  size="icon-sm"
                  aria-label="Send"
                  disabled={working || !teammate.connected || !draft.trim()}
                >
                  <ArrowUpIcon weight="duotone" />
                </Button>
              </ComposerBar>
            </Composer>
          </form>
        </div>
      </div>
    </div>
  )
}
