import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { Section } from "@/components/app/page"
import { DeleteTeammate } from "@/components/teammates/delete-teammate"
import { TeammateForm } from "@/components/teammates/teammate-form"
import { TeammateMemory } from "@/components/teammates/teammate-memory"
import { botIdSchema, NEW_KEY } from "@/lib/bot-schemas"
import { teammatePictureUrl } from "@/lib/format"
import { providerKeyOptions } from "@/lib/provider-display"
import { emptyProviderKey } from "@/lib/provider-key-schemas"
import { findBot } from "@/server/db/queries/bots"
import { listProviderKeys } from "@/server/db/queries/provider-keys"
import { env } from "@/server/env"
import { requireUser } from "@/server/session"

async function loadBot(params: PageProps<"/teammates/[botId]">["params"]) {
  const { botId } = await params
  const id = botIdSchema.safeParse(botId)
  if (!id.success) notFound()
  const user = await requireUser()
  const bot = await findBot(user.id, id.data)
  if (!bot) notFound()
  return { user, bot }
}

export async function generateMetadata({
  params,
}: PageProps<"/teammates/[botId]">): Promise<Metadata> {
  const { bot } = await loadBot(params)
  return { title: `${bot.name}'s settings · Ace` }
}

export default async function TeammatePage({
  params,
}: PageProps<"/teammates/[botId]">) {
  const { user, bot } = await loadBot(params)
  const keys = providerKeyOptions(await listProviderKeys(user.id))
  const picture = teammatePictureUrl(bot)

  return (
    <TeammateForm
      key={bot.updatedAt.getTime()}
      mode="edit"
      botId={bot.id}
      savedName={bot.name}
      savedPicture={picture}
      providerKeys={keys}
      allowCustom={env.ALLOW_CUSTOM_BASE_URL}
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
  )
}
