import { redirect } from "next/navigation"
import { EmptyState } from "@/components/app/setup-guide"
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
      <EmptyState
        heading="h1"
        title="Let's set up your first teammate"
        description="A teammate is like a coworker with its own computer. You chat with it, hand it a task, and it gets it done. It checks with you before anything important."
        provider={keys[0]?.provider}
        hasTeammate={botCount > 0}
        className="w-full max-w-140"
      />
    </div>
  )
}
