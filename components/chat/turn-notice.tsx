import {
  HandPalmIcon,
  HourglassIcon,
  HourglassMediumIcon,
  InfoIcon,
} from "@phosphor-icons/react/ssr"
import Link from "next/link"
import { ErrorNotice } from "@/components/app/error-notice"
import { Alert, AlertAction, AlertDescription } from "@/components/ui/alert"
import { Button, buttonVariants } from "@/components/ui/button"
import type { TurnNotice as Notice, QueueEvent } from "@/lib/chat"
import { usd } from "@/lib/format"

export function UpNextNotice({
  queue,
  name,
}: {
  queue: QueueEvent
  name: string
}) {
  if (queue.waitingOn !== "work") {
    const chat = <Link href={`/chats/${queue.chatId}`}>{queue.title}</Link>
    return (
      <Alert variant="needs-you">
        <HandPalmIcon weight="duotone" />
        <AlertDescription>
          {name} is waiting for{" "}
          {queue.waitingOn === "control"
            ? "you to give back control"
            : "your answer"}{" "}
          in {chat}.
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <Alert>
      <HourglassMediumIcon weight="duotone" />
      <AlertDescription>
        {name} is finishing <b>{queue.title}</b> first. It'll start on this
        right after.
      </AlertDescription>
    </Alert>
  )
}

export function TurnNotice({
  notice,
  name,
  settingsHref,
  onKeepGoing,
}: {
  notice: Notice
  name: string
  settingsHref: string
  onKeepGoing?: () => void
}) {
  if (notice.reason === "error") return <ErrorNotice message={notice.message} />

  const changeLimit = (label: string) => (
    <Link
      href={settingsHref}
      className={buttonVariants({ variant: "ghost", size: "sm" })}
    >
      {label}
    </Link>
  )

  if (notice.reason === "step_limit") {
    return (
      <Alert variant="needs-you">
        <InfoIcon weight="duotone" />
        <AlertDescription>
          <b>
            {name} stopped after {notice.steps} steps
          </b>{" "}
          so it doesn't run on forever.
        </AlertDescription>
        <AlertAction>
          {onKeepGoing && (
            <Button size="sm" onClick={onKeepGoing}>
              Keep going
            </Button>
          )}
          {changeLimit("Change the step limit")}
        </AlertAction>
      </Alert>
    )
  }

  return (
    <Alert>
      <HourglassIcon weight="duotone" />
      <AlertDescription>
        {name} reached the <b>{usd(notice.limitUsd)}</b> limit{" "}
        {notice.reason === "task_budget" ? "for this task" : "for today"}.
      </AlertDescription>
      <AlertAction>{changeLimit("Change the spending limit")}</AlertAction>
    </Alert>
  )
}
