import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { cache } from "react"
import { Section } from "@/components/app/page"
import { RouteModal } from "@/components/app/route-modal"
import { DeleteTeammate } from "@/components/teammates/delete-teammate"
import { TeammateForm } from "@/components/teammates/teammate-form"
import { TeammateMemory } from "@/components/teammates/teammate-memory"
import { botIdSchema, NEW_KEY } from "@/lib/bot-schemas"
import { teammatePictureUrl } from "@/lib/format"
import { providerKeyOption } from "@/lib/provider-display"
import { emptyProviderKey } from "@/lib/provider-key-schemas"
import { modelCatalog } from "@/server/container"
import { findBot } from "@/server/db/queries/bots"
import { listProviderKeys } from "@/server/db/queries/provider-keys"
import { env, teammateCaps } from "@/server/env"
import { requireUser } from "@/server/session"

const loadBot = cache(async (botId: string) => {
  const id = botIdSchema.safeParse(botId)
  if (!id.success) notFound()
  const user = await requireUser()
  const bot = await findBot(user.id, id.data)
  if (!bot) notFound()
  return { user, bot }
})

export async function generateMetadata({
  params,
}: PageProps<"/teammates/[botId]">): Promise<Metadata> {
  const { bot } = await loadBot((await params).botId)
  return { title: `${bot.name}'s settings · Ace` }
}

export default async function TeammatePage({
  params,
}: PageProps<"/teammates/[botId]">) {
  const { user, bot } = await loadBot((await params).botId)
  const [keys, models] = await Promise.all([
    listProviderKeys(user.id).then((rows) => rows.map(providerKeyOption)),
    modelCatalog.listAll(),
  ])
  const picture = teammatePictureUrl(bot)

  return (
    <RouteModal fallback="/teammates" className="sm:max-w-180">
      <TeammateForm
        key={bot.updatedAt.getTime()}
        mode="edit"
        botId={bot.id}
        savedName={bot.name}
        savedPicture={picture}
        providerKeys={keys}
        models={models}
        allowCustom={env.ALLOW_CUSTOM_BASE_URL}
        limits={teammateCaps}
        defaultValues={{
          name: bot.name,
          job: bot.job,
          instructions: bot.instructions,
          providerKeyId: bot.providerKeyId ?? (keys.length > 0 ? "" : NEW_KEY),
          newKey: emptyProviderKey(),
          modelId: bot.modelId,
          fullAuto: bot.fullAuto,
          maxSteps: bot.maxSteps,
          taskBudgetUsd: bot.taskBudgetUsd,
          dailyBudgetUsd: bot.dailyBudgetUsd,
          askBefore: bot.askBefore,
        }}
      >
        <Section id="s-memory" title={`What ${bot.name} remembers`}>
          <TeammateMemory name={bot.name} notes={bot.notes} />
        </Section>
        <Section id="s-delete" title="Delete" hideTitle>
          <DeleteTeammate botId={bot.id} name={bot.name} picture={picture} />
        </Section>
      </TeammateForm>
    </RouteModal>
  )
}
