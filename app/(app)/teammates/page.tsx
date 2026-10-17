import { PlusIcon } from "@phosphor-icons/react/ssr"
import type { Metadata } from "next"
import Link from "next/link"
import { Page, PageHeader } from "@/components/app/page"
import { EmptyState } from "@/components/app/setup-guide"
import { TeammateCard } from "@/components/teammates/teammate-card"
import { buttonVariants } from "@/components/ui/button"
import { teammatePictureUrl } from "@/lib/format"
import { listBots } from "@/server/db/queries/bots"
import { listProviderKeys } from "@/server/db/queries/provider-keys"
import { requireUser } from "@/server/session"

export const metadata: Metadata = {
  title: "Teammates · Ace",
}

export default async function TeammatesPage() {
  const user = await requireUser()
  const [bots, keys] = await Promise.all([
    listBots(user.id),
    listProviderKeys(user.id),
  ])

  return (
    <Page
      width="max-w-240"
      title="Teammates"
      header={
        <PageHeader
          title="Teammates"
          description="Each teammate has its own computer, does one task at a time, and remembers what it learns."
          action={
            <Link href="/teammates/new" className={buttonVariants()}>
              <PlusIcon weight="regular" data-icon="inline-start" />
              New teammate
            </Link>
          }
        />
      }
    >
      {bots.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {bots.map((bot) => (
            <TeammateCard
              key={bot.id}
              id={bot.id}
              name={bot.name}
              job={bot.job}
              picture={teammatePictureUrl(bot)}
              working={bot.working}
              needsYou={bot.needsYou}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          title="Meet your first teammate"
          description="Teammates work on their own computer and check with you before anything important."
          provider={keys[0]?.provider}
          hasTeammate={false}
          className="py-10"
        />
      )}
    </Page>
  )
}
