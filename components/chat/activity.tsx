"use client"

import {
  BrainIcon,
  CaretDownIcon,
  CaretRightIcon,
  CheckCircleIcon,
  CircleNotchIcon,
  CursorClickIcon,
  EraserIcon,
  FileTextIcon,
  FloppyDiskIcon,
  FolderOpenIcon,
  HandPalmIcon,
  KeyboardIcon,
  LightbulbIcon,
  MonitorIcon,
  PauseCircleIcon,
  TerminalWindowIcon,
} from "@phosphor-icons/react/ssr"
import { useId, useState } from "react"
import { Tile } from "@/components/ui/tile"
import { workedFor } from "@/lib/format"
import { cn } from "@/lib/utils"
import type { Shot, Step } from "./message-parts"

const fileWords = {
  read: {
    running: "Reading",
    done: "Read",
    failed: "Couldn't read",
    fallback: "a file",
  },
  save: {
    running: "Saving",
    done: "Saved",
    failed: "Couldn't save",
    fallback: "a file",
  },
  look: {
    running: "Looking in",
    done: "Looked in",
    failed: "Couldn't look in",
    fallback: "a folder",
  },
}

const screenWords = {
  look: {
    running: "Looking at the screen",
    done: "Looked at the screen",
    failed: "Couldn't see the screen",
  },
  click: {
    running: "Clicking",
    done: "Clicked on the screen",
    failed: "Couldn't click",
  },
  type: {
    running: "Typing",
    done: "Typed on the keyboard",
    failed: "Couldn't type",
  },
  scroll: {
    running: "Scrolling",
    done: "Scrolled",
    failed: "Couldn't scroll",
  },
  move: {
    running: "Moving the mouse",
    done: "Moved the mouse",
    failed: "Couldn't move the mouse",
  },
  wait: {
    running: "Waiting a moment",
    done: "Waited a moment",
    failed: "Couldn't wait",
  },
}

function sentence(step: Step) {
  switch (step.kind) {
    case "screen": {
      const words = screenWords[step.verb]
      if (step.state === "running") return `${words.running}…`
      if (step.state === "done" && step.intent) return step.intent
      return words[step.state]
    }
    case "control":
      return step.state === "running"
        ? "Waiting while you're in control…"
        : "Waited while you were in control"
    case "think":
      return step.state === "running"
        ? "Thinking it through…"
        : "Thought it through"
    case "remember":
      if (step.state === "running") return "Remembering…"
      if (step.state === "failed") return "Couldn't save a note"
      return (
        <>
          Remembered: <b>{step.content}</b>
        </>
      )
    case "forget":
      if (step.state === "running") return "Forgetting a note…"
      if (step.state === "failed") return "Couldn't forget a note"
      return (
        <>
          Forgot: <b>{step.content}</b>
        </>
      )
    case "command": {
      const purpose = step.purpose ? ` to ${step.purpose}` : ""
      if (step.state === "running") return `Running a command${purpose}…`
      if (step.state === "failed") return `Couldn't run the command${purpose}`
      return `Ran a command${purpose}`
    }
    case "read":
    case "save":
    case "look": {
      const words = fileWords[step.kind]
      return (
        <>
          {words[step.state]} {step.name ? <b>{step.name}</b> : words.fallback}
          {step.state === "running" && "…"}
        </>
      )
    }
  }
}

const stepTiles = {
  remember: { color: "sun", Icon: LightbulbIcon },
  forget: { color: "sun", Icon: EraserIcon },
  command: { color: "lime", Icon: TerminalWindowIcon },
  read: { color: "sky", Icon: FileTextIcon },
  save: { color: "sky", Icon: FloppyDiskIcon },
  look: { color: "sky", Icon: FolderOpenIcon },
} as const

const screenIcons = {
  look: MonitorIcon,
  click: CursorClickIcon,
  type: KeyboardIcon,
  scroll: CursorClickIcon,
  move: CursorClickIcon,
  wait: MonitorIcon,
}

function StepIcon({ step }: { step: Step }) {
  if (step.state === "failed") {
    return <PauseCircleIcon weight="duotone" className="mt-px size-5" />
  }
  if (step.kind === "control") {
    return <HandPalmIcon weight="duotone" className="mt-px size-5" />
  }
  if (step.kind === "screen") {
    const Icon = screenIcons[step.verb]
    return (
      <Tile size="xs" color="peach" className="-mt-0.5">
        <Icon weight="duotone" />
      </Tile>
    )
  }
  if (step.kind === "think") {
    return (
      <Tile size="xs" color="grape" className="-mt-0.5">
        <BrainIcon weight="duotone" />
      </Tile>
    )
  }
  const { color, Icon } = stepTiles[step.kind]
  return (
    <Tile size="xs" color={color} className="-mt-0.5">
      <Icon weight="duotone" />
    </Tile>
  )
}

const marks = { working: "stroke-working", "needs-you": "stroke-needs-you" }

export function Screenshot({
  shot,
  at,
  mark = "working",
  className,
}: {
  shot: Shot
  at: { x: number; y: number } | undefined
  mark?: keyof typeof marks
  className?: string
}) {
  return (
    <svg
      viewBox={`0 0 ${shot.width} ${shot.height}`}
      aria-hidden
      className={cn(
        "block max-w-full rounded-sm bg-screen shadow-card",
        className
      )}
    >
      <image
        href={`/api/screenshots/${shot.id}`}
        width={shot.width}
        height={shot.height}
      />
      {at && (
        <circle
          cx={at.x}
          cy={at.y}
          r={36}
          strokeWidth={7}
          className={cn("fill-none", marks[mark])}
        />
      )}
    </svg>
  )
}

export function ShowDetails({
  details,
  className,
}: {
  details: string
  className?: string
}) {
  const detailsId = useId()
  const [open, setOpen] = useState(false)

  return (
    <div className={cn("flex flex-col", className)}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={detailsId}
        onClick={() => setOpen((value) => !value)}
        className="cursor-pointer self-start text-ink-3 underline decoration-line-strong underline-offset-3 hover:decoration-current"
      >
        {open ? "Hide details" : "Show details"}
      </button>
      {open && (
        <div
          id={detailsId}
          className="mt-1.5 max-h-45 overflow-auto rounded-sm bg-fill px-3 py-2.5 font-mono text-code whitespace-pre text-ink-2"
        >
          {details}
        </div>
      )}
    </div>
  )
}

export function Activity({
  steps,
  working,
  durationMs,
}: {
  steps: Step[]
  working: boolean
  durationMs: number | undefined
}) {
  const stepsId = useId()
  const [open, setOpen] = useState(false)
  const current = steps.at(-1)

  return (
    <div className="flex flex-col gap-1.5">
      <button
        type="button"
        aria-expanded={steps.length > 0 ? open : undefined}
        aria-controls={steps.length > 0 ? stepsId : undefined}
        disabled={steps.length === 0}
        onClick={() => setOpen((value) => !value)}
        className={cn(
          "-ml-2.5 inline-flex min-h-8 cursor-pointer items-center gap-2 self-start rounded-full py-1 pr-3 pl-2.5 text-body text-ink-2 transition duration-150 ease-out not-disabled:hover:bg-fill not-disabled:hover:text-ink disabled:cursor-default",
          working && "text-ink"
        )}
      >
        {working ? (
          <>
            <CircleNotchIcon
              weight="duotone"
              className="size-4.5 animate-spin text-working"
            />
            {current?.state === "running"
              ? sentence(current)
              : "Working on it…"}
            {steps.length > 0 && (
              <span className="text-ink-3">
                {open ? "Hide steps" : "Show steps"}
              </span>
            )}
          </>
        ) : (
          <>
            <Tile size="xs" color="mint">
              <CheckCircleIcon weight="duotone" />
            </Tile>
            {durationMs === undefined ? "Done" : workedFor(durationMs)}
            {open ? (
              <CaretDownIcon weight="duotone" className="size-4.5" />
            ) : (
              <CaretRightIcon weight="duotone" className="size-4.5" />
            )}
          </>
        )}
      </button>
      {open && (
        <ol
          id={stepsId}
          className="ml-2.5 flex flex-col gap-0.5 border-l-2 border-dotted border-line-strong pl-4.5"
        >
          {steps.map((step) => (
            <li key={step.key} className="flex flex-col gap-1.5 py-1.25">
              <div
                className={cn(
                  "flex items-start gap-2.5 text-body text-ink-2 [&_b]:font-medium [&_b]:text-ink",
                  step.state === "failed" &&
                    "[&_b]:text-needs-you [&_svg]:text-needs-you"
                )}
              >
                <StepIcon step={step} />
                <span className="min-w-0 flex-1">{sentence(step)}</span>
              </div>
              {step.kind === "screen" && step.shot && (
                <Screenshot
                  className="ml-9 w-50"
                  shot={step.shot}
                  at={step.verb === "click" ? step.at : undefined}
                />
              )}
              {step.kind === "command" &&
                step.command &&
                step.state !== "running" && (
                  <ShowDetails
                    className="ml-9 text-caption"
                    details={[`$ ${step.command}`, step.output]
                      .filter(Boolean)
                      .join("\n")}
                  />
                )}
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}
