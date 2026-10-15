import { CheckIcon } from "@phosphor-icons/react/ssr"
import Link from "next/link"
import { TeammateAvatar } from "@/components/ui/avatar"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

function Step({
  number,
  done,
  title,
  description,
  action,
}: {
  number: number
  done?: boolean
  title: string
  description: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex items-center gap-3.5 rounded-md bg-surface px-4 py-3.5 shadow-card">
      <span
        className={cn(
          "grid size-7.5 shrink-0 place-items-center rounded-full bg-fill font-display text-small font-semibold",
          done && "bg-candy-mint text-on-sun"
        )}
      >
        {done ? (
          <CheckIcon weight="duotone" className="size-4.5" aria-label="Done" />
        ) : (
          number
        )}
      </span>
      <span className="min-w-0 flex-1">
        <b className="block font-display text-name">{title}</b>
        <span className="text-small text-ink-3">{description}</span>
      </span>
      {!done && action}
    </div>
  )
}

export function EmptyStateFaces() {
  return (
    <div aria-hidden className="mb-1 flex items-end gap-2.5">
      <TeammateAvatar
        botId="writer"
        name="Writer"
        size="lg"
        className="-rotate-6"
      />
      <TeammateAvatar
        botId="researcher"
        name="Researcher"
        size="xl"
        className="-translate-y-1.5 rotate-5"
      />
      <TeammateAvatar
        botId="planner"
        name="Planner"
        size="lg"
        className="-rotate-6"
      />
    </div>
  )
}

export function SetupGuide({
  connectedProvider,
  hasTeammate,
}: {
  connectedProvider: string | null
  hasTeammate: boolean
}) {
  const connected = connectedProvider !== null

  return (
    <div className="mt-2 flex w-full max-w-110 flex-col gap-2.5 text-left">
      <Step
        number={1}
        done={connected}
        title="Connect your AI account"
        description={
          connected
            ? `${connectedProvider} · Connected`
            : "Teammates think using your own AI provider key."
        }
        action={
          <Link
            href="/providers"
            className={buttonVariants({ variant: "primary", size: "sm" })}
          >
            Connect
          </Link>
        }
      />
      <Step
        number={2}
        done={hasTeammate}
        title="Create a teammate"
        description="Give it a name and a job."
        action={
          <Link
            href="/teammates/new"
            className={buttonVariants({
              variant: connected ? "primary" : "secondary",
              size: "sm",
            })}
          >
            Create
          </Link>
        }
      />
      <Step
        number={3}
        title="Give it something to do"
        description="Start a chat and ask in plain words."
      />
    </div>
  )
}
