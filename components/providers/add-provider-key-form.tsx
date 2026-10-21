"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { CaretDownIcon, CaretRightIcon } from "@phosphor-icons/react/ssr"
import { useEffect, useId, useState } from "react"
import { useForm, useWatch } from "react-hook-form"
import { addProviderKey } from "@/app/(app)/providers/actions"
import { type ModelChoice, modelChoice } from "@/components/app/model-menu"
import { FormError } from "@/components/form/form-error"
import { ModelField } from "@/components/form/model-field"
import { SubmitButton } from "@/components/form/submit-button"
import { Card } from "@/components/ui/card"
import { callAction, setActionError } from "@/lib/action-client"
import {
  type CatalogModel,
  judgeModelFor,
  type Provider,
  type ProviderModels,
} from "@/lib/models"
import {
  emptyProviderKey,
  type ProviderKeyFormInput,
  providerKeyFormSchema,
} from "@/lib/provider-key-schemas"
import { ProviderKeyFields } from "./provider-key-fields"
import { useServerModels } from "./use-server-models"

function judgeChoices(
  list: readonly CatalogModel[],
  defaultId: string
): ModelChoice[] {
  return [
    modelChoice(
      { id: "", label: "Same as each teammate's model", vision: true },
      defaultId === ""
    ),
    ...list.map((model) => modelChoice(model, model.id === defaultId)),
  ]
}

function judgeDefault(models: ProviderModels, provider: Provider) {
  return judgeModelFor(provider, models[provider], "")
}

function blankKey(
  models: ProviderModels,
  provider?: Provider
): ProviderKeyFormInput {
  const values = emptyProviderKey(provider)
  return { ...values, judgeModelId: judgeDefault(models, values.provider) }
}

export function AddProviderKeyForm({
  allowCustom,
  models,
  labelledBy,
}: {
  allowCustom: boolean
  models: ProviderModels
  labelledBy: string
}) {
  const moreId = useId()
  const [moreOpen, setMoreOpen] = useState(false)
  const serverModels = useServerModels()
  const form = useForm<ProviderKeyFormInput>({
    resolver: zodResolver(providerKeyFormSchema),
    defaultValues: blankKey(models),
  })
  const provider = useWatch({ control: form.control, name: "provider" })
  const custom = provider === "openai_compatible"
  const { isSubmitSuccessful } = form.formState

  useEffect(() => {
    if (isSubmitSuccessful)
      form.reset(blankKey(models, form.getValues("provider")))
  }, [isSubmitSuccessful, form, models])

  function changeProvider(next: Provider) {
    form.clearErrors()
    form.setValue("judgeModelId", judgeDefault(models, next))
  }

  function loadServerModels(open: boolean) {
    if (!open || !custom) return
    const { baseUrl, apiKey } = form.getValues()
    serverModels.load(baseUrl, apiKey)
  }

  async function onSubmit(values: ProviderKeyFormInput) {
    const result = await callAction(() => addProviderKey(values))
    if (!result.ok) return setActionError(form, result)
    setMoreOpen(false)
  }

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      noValidate
      aria-labelledby={labelledBy}
    >
      <Card className="gap-4 px-4">
        <FormError control={form.control} />
        <ProviderKeyFields
          control={form.control}
          names={{ provider: "provider", baseUrl: "baseUrl", apiKey: "apiKey" }}
          provider={provider}
          allowCustom={allowCustom}
          onProviderChange={changeProvider}
        />
        <button
          type="button"
          aria-expanded={moreOpen}
          aria-controls={moreId}
          onClick={() => setMoreOpen((open) => !open)}
          className="inline-flex cursor-pointer items-center gap-1.5 self-start rounded-mark text-small font-medium text-ink-2 transition-colors duration-150 ease-out hover:text-ink"
        >
          {moreOpen ? (
            <CaretDownIcon weight="duotone" className="size-4.5" />
          ) : (
            <CaretRightIcon weight="duotone" className="size-4.5" />
          )}
          More options
        </button>
        <div id={moreId} hidden={!moreOpen}>
          <ModelField
            control={form.control}
            name="judgeModelId"
            label="Model for safety checks"
            choices={
              custom
                ? judgeChoices(serverModels.models, "")
                : judgeChoices(models[provider], judgeDefault(models, provider))
            }
            allowTyped={custom}
            onOpenChange={loadServerModels}
            description="Ace uses it to check risky actions before a teammate takes them. A smaller, cheaper model works well."
          />
        </div>
        <div className="flex justify-end">
          <SubmitButton control={form.control}>Add key</SubmitButton>
        </div>
      </Card>
    </form>
  )
}
