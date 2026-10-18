import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { Page, PageHeader } from "@/components/app/page"
import { NewChatForm } from "@/components/chat/new-chat-form"
import { teammatePictureUrl } from "@/lib/format"
import { listBots } from "@/server/db/queries/bots"
import { requireUser } from "@/server/session"

export const metadata: Metadata = {
  title: "New chat · Ace",
}

export default async function NewChatPage({
  searchParams,
}: PageProps<"/chats/new">) {
  const user = await requireUser()
  const bots = await listBots(user.id)
  if (bots.length === 0) redirect("/")
  const { teammate } = await searchParams
  const picked = bots.find((bot) => bot.id === teammate) ?? bots[0]

  return (
    <Page
      width="max-w-thread"
      title="Who should work on this?"
      header={
        <PageHeader
          title="Who should work on this?"
          description="Pick one teammate, or a few to work on it together."
        />
      }
    >
      <NewChatForm
        chatId={crypto.randomUUID()}
        defaultBotId={picked.id}
        teammates={bots.map((bot) => ({
          id: bot.id,
          name: bot.name,
          job: bot.job,
          picture: teammatePictureUrl(bot),
        }))}
      />
    </Page>
  )
}
