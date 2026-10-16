import type { Metadata } from "next"
import { connection } from "next/server"
import { RouteModal } from "@/components/app/route-modal"
import { TeammateForm } from "@/components/teammates/teammate-form"
import { DEFAULT_ASK_BEFORE, NEW_KEY } from "@/lib/bot-schemas"
import { defaultModelId } from "@/lib/models"
import { providerKeyOption } from "@/lib/provider-display"
import { emptyProviderKey } from "@/lib/provider-key-schemas"
import { modelCatalog } from "@/server/container"
import { listProviderKeys } from "@/server/db/queries/provider-keys"
import { env } from "@/server/env"
import { requireUser } from "@/server/session"

export const metadata: Metadata = {
  title: "New teammate · Ace",
}

export default async function NewTeammatePage() {
  await connection()
  const user = await requireUser()
  const [keys, models] = await Promise.all([
    listProviderKeys(user.id).then((rows) => rows.map(providerKeyOption)),
    modelCatalog.listAll(),
  ])
  const firstKey = keys[0]

  return (
    <RouteModal fallback="/teammates" className="sm:max-w-180">
      <TeammateForm
        mode="create"
        botId={crypto.randomUUID()}
        savedName=""
        savedPicture={null}
        providerKeys={keys}
        models={models}
        allowCustom={env.ALLOW_CUSTOM_BASE_URL}
        defaultValues={{
          name: "",
          job: "",
          instructions: "",
          providerKeyId: firstKey?.id ?? NEW_KEY,
          newKey: emptyProviderKey(),
          modelId: defaultModelId(models[firstKey?.provider ?? "anthropic"]),
          fullAuto: false,
          maxSteps: 50,
          taskBudgetUsd: 1,
          dailyBudgetUsd: 5,
          askBefore: DEFAULT_ASK_BEFORE,
        }}
      />
    </RouteModal>
  )
}
