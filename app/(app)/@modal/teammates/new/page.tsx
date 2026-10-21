import type { Metadata } from "next"
import { RouteModal } from "@/components/app/route-modal"
import { TeammateForm } from "@/components/teammates/teammate-form"
import {
  cappedLimits,
  DEFAULT_ASK_BEFORE,
  DEFAULT_LIMITS,
  NEW_KEY,
} from "@/lib/bot-schemas"
import { defaultModelId } from "@/lib/models"
import { emptyProviderKey } from "@/lib/provider-key-schemas"
import { modelCatalog } from "@/server/container"
import { env, teammateCaps } from "@/server/env"
import { listProviderKeyModels } from "@/server/provider-key-models"
import { requireUser } from "@/server/session"

export const metadata: Metadata = {
  title: "New teammate · Ace",
}

export default async function NewTeammatePage() {
  const user = await requireUser()
  const [keys, models] = await Promise.all([
    listProviderKeyModels(user.id),
    modelCatalog.listAll(),
  ])
  const firstKey = keys[0]

  return (
    <RouteModal fallback="/teammates" className="sm:max-w-160">
      <TeammateForm
        mode="create"
        botId={crypto.randomUUID()}
        savedName=""
        savedPicture={null}
        providerKeys={keys}
        models={models}
        allowCustom={env.ALLOW_CUSTOM_BASE_URL}
        limits={teammateCaps}
        defaultValues={{
          name: "",
          job: "",
          instructions: "",
          providerKeyId: firstKey?.id ?? NEW_KEY,
          newKey: emptyProviderKey(),
          modelId: defaultModelId(firstKey?.models ?? models.anthropic),
          fullAuto: false,
          ...cappedLimits(DEFAULT_LIMITS, teammateCaps),
          askBefore: DEFAULT_ASK_BEFORE,
        }}
      />
    </RouteModal>
  )
}
