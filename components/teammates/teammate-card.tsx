import Link from "next/link"
import { TeammateAvatar } from "@/components/ui/avatar"
import { buttonVariants } from "@/components/ui/button"
import { Status } from "@/components/ui/status"

export function TeammateCard({
  id,
  name,
  job,
  picture,
  working,
}: {
  id: string
  name: string
  job: string
  picture: string | null
  working: boolean
}) {
  const href = `/teammates/${id}`

  return (
    <article className="relative flex min-w-0 flex-col gap-4 rounded-md bg-surface p-5 shadow-card">
      <div className="flex min-w-0 items-center gap-3.5">
        <TeammateAvatar botId={id} name={name} picture={picture} size="lg" />
        <div className="min-w-0">
          <h2 className="font-display text-name-lg">
            <Link
              href={href}
              className="after:absolute after:inset-0 after:rounded-md focus-visible:outline-hidden focus-visible:after:outline-2 focus-visible:after:outline-offset-2 focus-visible:after:outline-ring"
            >
              {name}
            </Link>
          </h2>
          <p className="text-small text-ink-2">{job}</p>
        </div>
      </div>
      <div className="flex min-h-control-sm items-center justify-between gap-2">
        {working ? <Status tone="working">Working</Status> : <span />}
        <div className="flex gap-2">
          <Link
            href={href}
            aria-label={`${name}'s settings`}
            className={buttonVariants({
              variant: "ghost",
              size: "sm",
              className: "relative",
            })}
          >
            Settings
          </Link>
          <Link
            href={`/chats/new?teammate=${id}`}
            aria-label={`Chat with ${name}`}
            className={buttonVariants({
              variant: "secondary",
              size: "sm",
              className: "relative",
            })}
          >
            Chat
          </Link>
        </div>
      </div>
    </article>
  )
}
