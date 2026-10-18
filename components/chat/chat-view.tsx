"use client"

import { useChat } from "@ai-sdk/react"
import {
  ArrowUpIcon,
  AtIcon,
  HandPalmIcon,
  InfoIcon,
  MonitorIcon,
} from "@phosphor-icons/react/ssr"
import {
  isToolUIPart,
  lastAssistantMessageIsCompleteWithApprovalResponses,
} from "ai"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  type ReactNode,
  useEffect,
  useEffectEvent,
  useRef,
  useState,
  useSyncExternalStore,
} from "react"
import { useDefaultLayout } from "react-resizable-panels"
import {
  Conversation,
  ConversationContent,
} from "@/components/ai-elements/conversation"
import { useReportLiveChat } from "@/components/app/live-chat"
import { Alert, AlertAction, AlertDescription } from "@/components/ui/alert"
import { AvatarGroup, TeammateAvatar } from "@/components/ui/avatar"
import { Button, buttonVariants } from "@/components/ui/button"
import {
  Composer,
  ComposerBar,
  ComposerHint,
  ComposerTextarea,
} from "@/components/ui/composer"
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable"
import { Status } from "@/components/ui/status"
import { SOMETHING_WENT_WRONG } from "@/lib/action-result"
import {
  type ControlEvent,
  handoffMessage,
  mentionedTeammate,
  nameList,
  nextTeammate,
  type TeammateMessage,
} from "@/lib/chat"
import { type ChatTeammate, TeammateReply, YourMessage } from "./chat-message"
import { takePendingMessage } from "./pending-message"
import { ScreenPanel } from "./screen-panel"
import {
  type ChatSession,
  expectNextTurn,
  useChatTransport,
} from "./use-chat-transport"

const wideQuery = "(min-width: 80rem)"

function subscribeToWide(onChange: () => void) {
  const query = matchMedia(wideQuery)
  query.addEventListener("change", onChange)
  return () => query.removeEventListener("change", onChange)
}

function useWide() {
  return useSyncExternalStore(
    subscribeToWide,
    () => matchMedia(wideQuery).matches,
    () => false
  )
}

function ScreenSplit({
  chat,
  screen,
  label,
}: {
  chat: ReactNode
  screen: ReactNode
  label: string
}) {
  const { defaultLayout, onLayoutChanged } = useDefaultLayout({
    id: "chat-screen",
    panelIds: screen ? ["chat", "screen"] : ["chat"],
  })

  return (
    <ResizablePanelGroup
      defaultLayout={defaultLayout}
      onLayoutChanged={onLayoutChanged}
      className="min-h-0 flex-1"
    >
      <ResizablePanel id="chat" minSize="380px" className="flex">
        {chat}
      </ResizablePanel>
      {screen && (
        <>
          <ResizableHandle aria-label={`Resize ${label}`} />
          <ResizablePanel id="screen" defaultSize="36.5rem" minSize="20rem">
            <aside aria-label={label} className="h-full py-5 pr-6">
              {screen}
            </aside>
          </ResizablePanel>
        </>
      )}
    </ResizablePanelGroup>
  )
}

function passedOn(message: TeammateMessage) {
  for (const part of message.parts) {
    if (part.type === "tool-handoff" && part.state === "output-available") {
      return { input: part.input, output: part.output }
    }
  }
}

export function ChatView({
  chatId,
  title,
  teammates,
  lastBotId,
  controlBotId,
  initialMessages,
  session,
}: {
  chatId: string
  title: string
  teammates: ChatTeammate[]
  lastBotId: string | null
  controlBotId: string | null
  initialMessages: TeammateMessage[]
  session: ChatSession | undefined
}) {
  const router = useRouter()
  const transport = useChatTransport(chatId, session)
  const [resume] = useState(initialMessages.length > 0)
  const [failures, setFailures] = useState<Record<string, string>>({})
  const [handedOn, setHandedOn] = useState<TeammateMessage>()
  const [draft, setDraft] = useState("")
  const lastFailure = useRef(SOMETHING_WENT_WRONG)
  const {
    messages,
    sendMessage,
    setMessages,
    resumeStream,
    status,
    error,
    addToolApprovalResponse,
  } = useChat<TeammateMessage>({
    id: chatId,
    messages: initialMessages,
    transport,
    resume,
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithApprovalResponses,
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
      if (!isError && passedOn(message)) setHandedOn(message)
      router.refresh()
    },
  })
  const inControl = controlBotId !== null
  const [screenOpen, setScreenOpen] = useState(inControl)
  const [fullSize, setFullSize] = useState(false)
  const [shownCall, setShownCall] = useState<string>()
  const wide = useWide()
  const working = status === "submitted" || status === "streaming"
  const last = messages.at(-1)
  const screenCall =
    working && last?.role === "assistant"
      ? last.parts.find((part) => part.type === "tool-computer")?.toolCallId
      : undefined
  if (wide && screenCall && screenCall !== shownCall) {
    setShownCall(screenCall)
    setScreenOpen(true)
  }
  const group = teammates.length > 1
  const byId = (id: string | null | undefined) =>
    teammates.find((teammate) => teammate.id === id)
  const lastActiveId =
    messages.findLast((message) => message.metadata?.botId)?.metadata?.botId ??
    lastBotId
  const current = nextTeammate(
    last?.role === "user" ? last : undefined,
    teammates,
    lastActiveId
  )
  const nextUp =
    mentionedTeammate(draft, teammates) ??
    nextTeammate(undefined, teammates, lastActiveId)
  const onScreen = byId(controlBotId) ?? current
  const queued =
    working &&
    last?.role === "assistant" &&
    last.parts.some(
      (part) => part.type === "data-queue" && part.data.startedAt === undefined
    )
  const needsYou =
    !working &&
    last?.role === "assistant" &&
    last.parts.some(
      (part) =>
        isToolUIPart(part) &&
        part.state === "approval-requested" &&
        !part.approval.isAutomatic
    )
  const canSend = nextUp.connected && !working && !inControl && !needsYou
  useReportLiveChat(chatId, { working, queued, needsYou })

  const followHandoff = useEffectEvent((message: TeammateMessage) => {
    const passed = passedOn(message)
    const from = byId(message.metadata?.botId)
    if (!passed || !from) return
    setMessages((shown) => [
      ...shown,
      handoffMessage(
        { id: passed.output.id, fromBotId: from.id, ...passed.input },
        { from: from.name, to: passed.output.name },
        passed.output.at
      ),
    ])
    expectNextTurn(transport, chatId)
    resumeStream()
  })

  useEffect(() => {
    if (!handedOn || status !== "ready") return
    setHandedOn(undefined)
    followHandoff(handedOn)
  }, [handedOn, status])

  function send(text: string) {
    sendMessage({ text, metadata: { createdAt: Date.now() } })
  }

  function handedBack(control: ControlEvent) {
    sendMessage({
      text: "I'm done with your screen and gave you back control. Look at it again, then carry on.",
      metadata: { createdAt: Date.now(), control },
    })
  }

  const sendPending = useEffectEvent(() => {
    const pending = takePendingMessage(chatId)
    if (pending) send(pending)
  })

  useEffect(() => {
    const timer = setTimeout(sendPending)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    if (!fullSize) return
    const shrink = (event: KeyboardEvent) => {
      if (event.key === "Escape") setFullSize(false)
    }
    addEventListener("keydown", shrink)
    return () => removeEventListener("keydown", shrink)
  }, [fullSize])

  const screenLabel = `${onScreen.name}'s screen`
  const chat = (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <Conversation>
        <ConversationContent>
          {messages.map((message, index) =>
            message.role === "user" ? (
              <YourMessage
                key={message.id}
                message={message}
                teammates={teammates}
              />
            ) : (
              <TeammateReply
                key={message.id}
                teammate={byId(message.metadata?.botId) ?? current}
                team={teammates}
                message={message}
                working={working && index === messages.length - 1}
                error={failures[message.id]}
                onKeepGoing={
                  index === messages.length - 1 && canSend
                    ? () => send("Keep going")
                    : undefined
                }
                onAnswer={
                  index === messages.length - 1 && needsYou
                    ? (id, approved) =>
                        addToolApprovalResponse({ id, approved })
                    : undefined
                }
              />
            )
          )}
          {last?.role === "user" && (status === "submitted" || error) && (
            <TeammateReply
              teammate={current}
              team={teammates}
              message={undefined}
              working={status === "submitted"}
              error={error && (error.message || SOMETHING_WENT_WRONG)}
            />
          )}
        </ConversationContent>
      </Conversation>

      <div className="px-4 pb-5 sm:px-6">
        <div className="mx-auto flex max-w-thread flex-col gap-3">
          {!nextUp.connected && (
            <Alert variant="needs-you">
              <InfoIcon weight="duotone" />
              <AlertDescription>
                {nextUp.name} isn't connected to an AI provider yet.
              </AlertDescription>
              <AlertAction>
                <Link
                  href={`/teammates/${nextUp.id}`}
                  className={buttonVariants({ size: "sm" })}
                >
                  Open {nextUp.name}'s settings
                </Link>
              </AlertAction>
            </Alert>
          )}
          <form
            noValidate
            onSubmit={(event) => {
              event.preventDefault()
              const text = draft.trim()
              if (!text || !canSend) return
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
                  group
                    ? "Message the team. Type @ to pick who answers."
                    : messages.length > 0
                      ? `Reply to ${current.name}…`
                      : `Ask ${current.name} to do something…`
                }
                aria-label={
                  group ? "Message to the team" : `Message to ${current.name}`
                }
              />
              <ComposerBar>
                <ComposerHint>
                  {inControl ? (
                    <>
                      <HandPalmIcon weight="duotone" />
                      {onScreen.name} is paused while you're in control
                    </>
                  ) : needsYou ? (
                    `${current.name} is waiting for your answer above`
                  ) : working ? (
                    `${current.name} is working on this. You can reply when it's done.`
                  ) : (
                    group && (
                      <>
                        <AtIcon weight="duotone" />
                        {nextUp.name} will reply
                      </>
                    )
                  )}
                </ComposerHint>
                <Button
                  type="submit"
                  size="icon-sm"
                  aria-label="Send"
                  disabled={!canSend || !draft.trim()}
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
  const screen = screenOpen && (
    <ScreenPanel
      chatId={chatId}
      teammate={onScreen}
      inControl={inControl}
      working={working}
      expanded={!wide || fullSize}
      onHandedBack={handedBack}
      onToggleSize={wide ? () => setFullSize((full) => !full) : undefined}
      onClose={() => setScreenOpen(false)}
    />
  )

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="flex min-h-16 flex-wrap items-center gap-3 border-b border-line px-4 py-3 sm:px-6">
        {group ? (
          <AvatarGroup>
            {teammates.map((teammate) => (
              <TeammateAvatar
                key={teammate.id}
                botId={teammate.id}
                name={teammate.name}
                picture={teammate.picture}
                size="sm"
              />
            ))}
          </AvatarGroup>
        ) : (
          <TeammateAvatar
            botId={current.id}
            name={current.name}
            picture={current.picture}
          />
        )}
        <div className="flex min-w-0 flex-1 flex-col">
          <h1 className="truncate font-display text-title">{title}</h1>
          <span className="text-caption text-ink-3">
            with {nameList(teammates.map((teammate) => teammate.name))}
          </span>
        </div>
        {needsYou ? (
          <Status tone="needs-you">Needs you</Status>
        ) : inControl ? (
          <Status tone="control">You're in control</Status>
        ) : queued ? (
          <Status tone="waiting">Up next</Status>
        ) : (
          working && (
            <Status tone="working">
              {group ? `${current.name} is working` : "Working"}
            </Status>
          )
        )}
        <Button
          variant="secondary"
          size="sm"
          aria-pressed={screenOpen}
          onClick={() => {
            setScreenOpen((open) => !open)
            setFullSize(false)
          }}
        >
          <MonitorIcon weight="duotone" data-icon="inline-start" />
          {screenOpen ? "Hide screen" : group ? screenLabel : "Show screen"}
        </Button>
      </header>

      {wide ? (
        <ScreenSplit chat={chat} screen={screen} label={screenLabel} />
      ) : (
        <div className="flex min-h-0 flex-1">
          {chat}
          {screen}
        </div>
      )}
    </div>
  )
}
