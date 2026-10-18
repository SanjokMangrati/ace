"use client"

import {
  CheckIcon,
  CursorClickIcon,
  EraserIcon,
  FileTextIcon,
  FloppyDiskIcon,
  FolderOpenIcon,
  GlobeSimpleIcon,
  HandPalmIcon,
  InfoIcon,
  KeyboardIcon,
  LightbulbIcon,
  TerminalWindowIcon,
  XIcon,
} from "@phosphor-icons/react/ssr"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { TextLink } from "@/components/ui/text-link"
import { Screenshot, ShowDetails } from "./activity"
import type { Ask, Step } from "./message-parts"
import { Time } from "./time"

type Words = {
  title: string
  line?: string
  details?: string
  Icon: typeof HandPalmIcon
}

function askWords(step: Step, name: string): Words {
  switch (step.kind) {
    case "command":
      return {
        title: `${name} wants to ${step.purpose ?? "run a command"}`,
        details: step.command && `$ ${step.command}`,
        Icon: TerminalWindowIcon,
      }
    case "save":
      return {
        title: `${name} wants to save a file`,
        line: step.name,
        Icon: FloppyDiskIcon,
      }
    case "read":
      return {
        title: `${name} wants to open a file`,
        line: step.name,
        Icon: FileTextIcon,
      }
    case "look":
      return {
        title: `${name} wants to look in a folder`,
        line: step.name,
        Icon: FolderOpenIcon,
      }
    case "remember":
      return {
        title: `${name} wants to remember something`,
        line: step.content,
        Icon: LightbulbIcon,
      }
    case "forget":
      return { title: `${name} wants to forget a note`, Icon: EraserIcon }
    case "screen":
      if (step.verb === "open") {
        return {
          title: `${name} wants to open a page on its screen`,
          line: step.text,
          Icon: GlobeSimpleIcon,
        }
      }
      if (step.verb === "type") {
        return {
          title: `${name} wants to type on its screen`,
          details: step.text,
          Icon: KeyboardIcon,
        }
      }
      return {
        title: `${name} wants to ${step.verb === "click" ? "click" : "use"} its screen`,
        Icon: CursorClickIcon,
      }
    default:
      return { title: `${name} wants to do something`, Icon: HandPalmIcon }
  }
}

function Answered({
  ask,
  name,
  settingsHref,
}: {
  ask: Ask
  name: string
  settingsHref: string
}) {
  const allowed = ask.answer === "allowed"
  const Icon = allowed ? CheckIcon : XIcon
  return (
    <p className="inline-flex flex-wrap items-center gap-2 text-body text-ink-3">
      <Icon weight="regular" className="size-4.5 shrink-0" />
      {allowed ? "You allowed this" : "You said no"}
      {ask.answeredAt !== undefined && (
        <>
          {" · "}
          <Time at={ask.answeredAt} />
        </>
      )}
      {" · "}
      <TextLink href={settingsHref} className="text-ink-3">
        Change what {name} asks about
      </TextLink>
    </p>
  )
}

export function PermissionCard({
  ask,
  name,
  fullAuto,
  settingsHref,
  onAnswer,
}: {
  ask: Ask
  name: string
  fullAuto: boolean
  settingsHref: string
  onAnswer?: (approved: boolean) => void
}) {
  if (ask.answer !== "pending") {
    return <Answered ask={ask} name={name} settingsHref={settingsHref} />
  }
  if (!onAnswer) return null

  const { title, line, details, Icon } = askWords(ask.step, name)
  const at =
    ask.step.kind === "screen" && ask.step.verb === "click"
      ? ask.step.at
      : undefined
  const allow = () => onAnswer(true)
  const deny = () => onAnswer(false)

  return (
    <Card
      role="group"
      aria-label={`${name} is asking for permission`}
      className="gap-0 py-0"
    >
      <div className="flex flex-col gap-3 px-4 py-3.5">
        <div className="flex items-start gap-3">
          <span className="grid size-9.5 shrink-0 place-items-center rounded-md bg-needs-you-soft text-needs-you">
            <Icon weight="duotone" className="size-4.5" />
          </span>
          <div className="min-w-0">
            <h3 className="font-display text-dialog-title text-ink">{title}</h3>
            {line && (
              <p className="mt-0.5 text-ink-2 wrap-break-word">{line}</p>
            )}
          </div>
        </div>
        {ask.step.kind === "screen" && ask.shot && (
          <Screenshot
            shot={ask.shot}
            at={at}
            mark="needs-you"
            className="ml-12.5 w-65"
          />
        )}
        {details && (
          <ShowDetails details={details} className="ml-12.5 text-body" />
        )}
        {ask.careful && (
          <div className="ml-12.5 flex items-start gap-2.5 rounded-sm bg-danger-soft px-3 py-2.5 text-body text-danger">
            <InfoIcon weight="duotone" className="mt-px size-4.5 shrink-0" />
            <span>{ask.careful} Only allow it if you asked for this.</span>
          </div>
        )}
      </div>
      <div className="flex flex-wrap items-center justify-end gap-2 px-4 pb-3.5">
        {ask.careful ? (
          <>
            {fullAuto && (
              <span className="mr-auto text-small text-ink-3">
                Asked even though {name} works without asking.
              </span>
            )}
            <Button variant="danger-quiet" size="sm" onClick={allow}>
              Allow anyway
            </Button>
            <Button size="sm" onClick={deny}>
              Don't allow
            </Button>
          </>
        ) : (
          <>
            <Button variant="secondary" size="sm" onClick={deny}>
              Don't allow
            </Button>
            <Button size="sm" onClick={allow}>
              Allow
            </Button>
          </>
        )}
      </div>
    </Card>
  )
}
