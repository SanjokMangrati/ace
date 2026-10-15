import {
  HourglassIcon,
  InfoIcon,
  WarningCircleIcon,
} from "@phosphor-icons/react/ssr"
import Link from "next/link"
import { Alert, AlertAction, AlertDescription } from "@/components/ui/alert"
import { Button, buttonVariants } from "@/components/ui/button"
import type { TurnNotice as Notice } from "@/lib/chat"
import { usd } from "@/lib/format"

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
  if (notice.reason === "error") {
    return (
      <Alert variant="danger">
        <WarningCircleIcon weight="duotone" />
        <AlertDescription>{notice.message}</AlertDescription>
      </Alert>
    )
  }

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
