"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { CaretDownIcon, CaretRightIcon } from "@phosphor-icons/react/ssr"
import { useEffect, useId, useState } from "react"
import { useForm, useWatch } from "react-hook-form"
import { addProviderKey } from "@/app/(app)/providers/actions"
import { FormError } from "@/components/form/form-error"
import { SubmitButton } from "@/components/form/submit-button"
import { TextField } from "@/components/form/text-field"
import { Card } from "@/components/ui/card"
import { callAction, setActionError } from "@/lib/action-client"
import {
  emptyProviderKey,
  type ProviderKeyFormInput,
  providerKeyFormSchema,
} from "@/lib/provider-key-schemas"
import { ProviderKeyFields } from "./provider-key-fields"

export function AddProviderKeyForm({
  allowCustom,
  labelledBy,
}: {
  allowCustom: boolean
  labelledBy: string
}) {
  const moreId = useId()
  const [moreOpen, setMoreOpen] = useState(false)
  const form = useForm<ProviderKeyFormInput>({
    resolver: zodResolver(providerKeyFormSchema),
    defaultValues: emptyProviderKey(),
  })
  const provider = useWatch({ control: form.control, name: "provider" })
  const { isSubmitSuccessful } = form.formState

  useEffect(() => {
    if (isSubmitSuccessful)
      form.reset(emptyProviderKey(form.getValues("provider")))
  }, [isSubmitSuccessful, form])

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
          <TextField
            control={form.control}
            name="judgeModelId"
            label={
              <>
                Model for safety checks
                <span className="font-normal text-ink-3">(optional)</span>
              </>
            }
            autoComplete="off"
            spellCheck={false}
            placeholder="Same as each teammate's model"
            description="Before a teammate does something that might be risky, Ace has an AI double-check it. A smaller, cheaper model works well here."
          />
        </div>
        <div className="flex justify-end">
          <SubmitButton control={form.control}>Add key</SubmitButton>
        </div>
      </Card>
    </form>
  )
}
