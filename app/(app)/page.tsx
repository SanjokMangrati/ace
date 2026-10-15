import { redirect } from "next/navigation"
import { EmptyStateFaces, SetupGuide } from "@/components/app/setup-guide"
import { providerLabel } from "@/lib/models"
import { countBots } from "@/server/db/queries/bots"
import { listProviderKeys } from "@/server/db/queries/provider-keys"
import { requireUser } from "@/server/session"

export default async function HomePage() {
  const user = await requireUser()
  const [keys, botCount] = await Promise.all([
    listProviderKeys(user.id),
    countBots(user.id),
  ])
  if (keys.length > 0 && botCount > 0) redirect("/chats/new")

  return (
    <div className="flex flex-1 items-center justify-center px-4 py-10 sm:px-6">
      <div className="flex w-full max-w-140 flex-col items-center gap-3 text-center">
        <EmptyStateFaces />
        <h1 className="font-display text-title-lg text-balance">
          Let's set up your first teammate
        </h1>
        <p className="max-w-empty text-ink-2">
          A teammate is like a coworker with its own computer. You chat with it,
          hand it a task, and it gets it done. It checks with you before
          anything important.
        </p>
        <SetupGuide
          connectedProvider={keys[0] ? providerLabel(keys[0].provider) : null}
          hasTeammate={botCount > 0}
        />
      </div>
    </div>
  )
}
