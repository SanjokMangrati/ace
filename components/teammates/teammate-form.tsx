"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { CaretLeftIcon } from "@phosphor-icons/react/ssr"
import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { flushSync } from "react-dom"
import { type FieldErrors, useForm, useWatch } from "react-hook-form"
import { createTeammate, updateTeammate } from "@/app/(app)/teammates/actions"
import { Page, Section } from "@/components/app/page"
import { FormError } from "@/components/form/form-error"
import { NumberSentenceField } from "@/components/form/number-sentence-field"
import {
  SelectField,
  type SelectFieldOption,
} from "@/components/form/select-field"
import { SubmitButton } from "@/components/form/submit-button"
import { TextField } from "@/components/form/text-field"
import { TextareaField } from "@/components/form/textarea-field"
import { ProviderKeyFields } from "@/components/providers/provider-key-fields"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { TeammateAvatar } from "@/components/ui/avatar"
import { buttonVariants } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  ADVANCED_FIELDS,
  NEW_KEY,
  type TeammateFormInput,
  teammateFormSchema,
} from "@/lib/bot-schemas"
import {
  catalogModel,
  defaultModelId,
  PROVIDER_INFO,
  type Provider,
} from "@/lib/models"
import { findPreset, type TeammatePreset } from "@/lib/teammate-presets"
import { AskBefore } from "./ask-before"
import { checkPicture, PictureField } from "./picture-field"
import { PresetPicker } from "./preset-picker"

export type ProviderKeyOption = {
  id: string
  provider: Provider
  label: string
  detail: string
}

const FORM_ID = "teammate-form"
const ADVANCED = "advanced"

function usePicturePreview(file: File | null) {
  const url = useMemo(() => (file ? URL.createObjectURL(file) : null), [file])
  useEffect(() => {
    if (!url) return
    return () => URL.revokeObjectURL(url)
  }, [url])
  return url
}

export function TeammateForm({
  mode,
  botId,
  savedName,
  savedPicture,
  defaultValues,
  providerKeys,
  allowCustom,
  children,
}: {
  mode: "create" | "edit"
  botId: string
  savedName: string
  savedPicture: string | null
  defaultValues: TeammateFormInput
  providerKeys: ProviderKeyOption[]
  allowCustom: boolean
  children?: React.ReactNode
}) {
  const form = useForm<TeammateFormInput>({
    resolver: zodResolver(teammateFormSchema),
    defaultValues,
  })
  const [advanced, setAdvanced] = useState<string[]>([])
  const [pictureFile, setPictureFile] = useState<File | null>(null)
  const [pictureRemoved, setPictureRemoved] = useState(false)
  const [pictureError, setPictureError] = useState<string | null>(null)
  const preview = usePicturePreview(pictureFile)
  const picture = preview ?? (pictureRemoved ? null : savedPicture)

  const watchedName = useWatch({ control: form.control, name: "name" })
  const watchedJob = useWatch({ control: form.control, name: "job" })
  const watchedInstructions = useWatch({
    control: form.control,
    name: "instructions",
  })
  const providerKeyId = useWatch({
    control: form.control,
    name: "providerKeyId",
  })
  const newKeyProvider = useWatch({
    control: form.control,
    name: "newKey.provider",
  })

  const displayName = watchedName.trim() || savedName
  const name = displayName || "Your teammate"
  const nameInSentence = displayName || "your teammate"
  const addingKey = providerKeyId === NEW_KEY
  const provider: Provider | undefined = addingKey
    ? newKeyProvider
    : providerKeys.find((key) => key.id === providerKeyId)?.provider
  const catalog = provider ? PROVIDER_INFO[provider].models : []

  const keyOptions: SelectFieldOption[] = [
    ...providerKeys.map((key) => ({
      value: key.id,
      label: key.label,
      detail: key.detail,
    })),
    { value: NEW_KEY, label: "Add a new key" },
  ]
  const modelOptions: SelectFieldOption[] = catalog.map((model) => ({
    value: model.id,
    label: model.label,
    detail: model.vision ? "Can see and use its screen" : "Can't see screens",
  }))

  function syncModel(next: Provider | undefined) {
    if (!next) return
    const current = form.getValues("modelId")
    if (PROVIDER_INFO[next].models.length > 0) {
      if (!catalogModel(next, current)) {
        form.setValue("modelId", defaultModelId(next))
      }
    } else if (provider && catalogModel(provider, current)) {
      form.setValue("modelId", "")
    }
  }

  function onKeyChange(keyId: string) {
    if (keyId === NEW_KEY) {
      syncModel(form.getValues("newKey.provider"))
      return
    }
    form.resetField("newKey")
    syncModel(providerKeys.find((key) => key.id === keyId)?.provider)
  }

  const preset = findPreset({
    name: watchedName,
    job: watchedJob,
    instructions: watchedInstructions,
  })

  function pickPreset(picked: TeammatePreset) {
    const clear = preset?.id === picked.id
    const fields = ["name", "job", "instructions"] as const
    for (const field of fields) {
      form.setValue(field, clear ? "" : picked[field], { shouldDirty: true })
    }
    form.clearErrors([...fields])
  }

  function openAdvanced() {
    flushSync(() => setAdvanced([ADVANCED]))
  }

  function onInvalid(errors: FieldErrors<TeammateFormInput>) {
    if (ADVANCED_FIELDS.some((field) => errors[field])) openAdvanced()
  }

  function pickPicture(file: File) {
    const problem = checkPicture(file)
    setPictureError(problem)
    if (problem) return
    setPictureFile(file)
    setPictureRemoved(false)
  }

  function removePicture() {
    setPictureFile(null)
    setPictureRemoved(true)
    setPictureError(null)
  }

  async function onSubmit(values: TeammateFormInput) {
    const formData = new FormData()
    formData.set("id", botId)
    formData.set("data", JSON.stringify(values))
    if (pictureFile) formData.set("picture", pictureFile)
    else if (pictureRemoved) formData.set("removePicture", "true")

    const save = mode === "create" ? createTeammate : updateTeammate
    const result = await save(formData)
    if (!result || result.ok) return
    const field = result.field
    if (field === "picture") {
      setPictureError(result.message)
      form.setError("root.picture", { message: result.message })
    } else if (field) {
      if (
        ADVANCED_FIELDS.some((advancedField) => field.startsWith(advancedField))
      ) {
        openAdvanced()
      }
      form.setError(field, { message: result.message }, { shouldFocus: true })
    } else {
      form.setError("root", { message: result.message })
    }
  }

  return (
    <>
      <Page className="max-w-180 gap-12 pb-12">
        <form
          id={FORM_ID}
          onSubmit={form.handleSubmit(onSubmit, onInvalid)}
          noValidate
          aria-labelledby="teammate-title"
          className="flex flex-col gap-12"
        >
          <div className="flex flex-col gap-4">
            <Link
              href="/teammates"
              className={buttonVariants({
                variant: "ghost",
                size: "sm",
                className: "-ml-3 self-start",
              })}
            >
              <CaretLeftIcon weight="duotone" data-icon="inline-start" />
              Teammates
            </Link>
            <div className="flex items-center gap-4.5">
              <TeammateAvatar
                botId={botId}
                name={name}
                picture={picture}
                size="xl"
              />
              <div className="min-w-0">
                <h1
                  id="teammate-title"
                  className="font-display text-title-lg wrap-break-word"
                >
                  {displayName || "New teammate"}
                </h1>
                {watchedJob.trim() && (
                  <p className="mt-1 text-ink-2 wrap-break-word">
                    {watchedJob.trim()}
                  </p>
                )}
              </div>
            </div>
          </div>

          <FormError control={form.control} />

          {mode === "create" && (
            <Section id="s-preset" title="Start from an example">
              <PresetPicker selected={preset?.id} onPick={pickPreset} />
            </Section>
          )}

          <Section id="s-profile" title="Profile">
            <Card className="gap-6 p-6">
              <PictureField
                hasPicture={picture !== null}
                error={pictureError}
                onPick={pickPicture}
                onRemove={removePicture}
              />
              <TextField
                control={form.control}
                name="name"
                label="Name"
                autoComplete="off"
              />
              <TextField
                control={form.control}
                name="job"
                label="Job"
                autoComplete="off"
              />
              <TextareaField
                control={form.control}
                name="instructions"
                label="Instructions"
                rows={5}
              />
            </Card>
          </Section>

          <Section id="s-model" title="AI model">
            <Card className="gap-6 p-6">
              {providerKeys.length > 0 && (
                <SelectField
                  control={form.control}
                  name="providerKeyId"
                  label="AI provider"
                  options={keyOptions}
                  placeholder="Pick an AI provider"
                  onValueChange={onKeyChange}
                />
              )}
              {addingKey && (
                <ProviderKeyFields
                  control={form.control}
                  names={{
                    provider: "newKey.provider",
                    baseUrl: "newKey.baseUrl",
                    apiKey: "newKey.apiKey",
                  }}
                  provider={newKeyProvider}
                  allowCustom={allowCustom}
                  onProviderChange={syncModel}
                />
              )}
              {provider && catalog.length === 0 ? (
                <TextField
                  control={form.control}
                  name="modelId"
                  label="Model"
                  autoComplete="off"
                  spellCheck={false}
                />
              ) : (
                <SelectField
                  control={form.control}
                  name="modelId"
                  label="Model"
                  options={modelOptions}
                  placeholder="Pick a model"
                  disabled={!provider}
                />
              )}
            </Card>
          </Section>

          <Accordion value={advanced} onValueChange={setAdvanced}>
            <AccordionItem value={ADVANCED}>
              <AccordionTrigger
                heading="h2"
                className="font-display text-title"
              >
                Advanced
              </AccordionTrigger>
              <AccordionContent
                keepMounted
                className="flex flex-col gap-12 pt-8"
              >
                <Section
                  id="s-ask"
                  heading="h3"
                  title={`When ${nameInSentence} asks you`}
                >
                  <AskBefore
                    control={form.control}
                    name={name}
                    nameInSentence={nameInSentence}
                  />
                </Section>

                <Section id="s-limits" heading="h3" title="Limits">
                  <Card className="gap-4 p-6">
                    <NumberSentenceField
                      control={form.control}
                      name="maxSteps"
                      before="Stop after"
                      after="steps on one task"
                    />
                    <NumberSentenceField
                      control={form.control}
                      name="taskBudgetUsd"
                      before="Spend at most $"
                      after="on one task"
                      decimals={2}
                    />
                    <NumberSentenceField
                      control={form.control}
                      name="dailyBudgetUsd"
                      before="Spend at most $"
                      after="a day"
                      decimals={2}
                    />
                  </Card>
                </Section>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </form>
        {children}
      </Page>
      <div className="sticky bottom-0 flex flex-wrap items-center justify-end gap-2 border-t border-line bg-bg px-4 py-3.5 sm:px-6">
        {mode === "edit" && (
          <span className="mr-auto text-small text-ink-3">
            Changes apply from {savedName}'s next task.
          </span>
        )}
        <Link
          href="/teammates"
          className={buttonVariants({ variant: "ghost" })}
        >
          Cancel
        </Link>
        <SubmitButton control={form.control} form={FORM_ID}>
          {mode === "create" ? "Create teammate" : "Save changes"}
        </SubmitButton>
      </div>
    </>
  )
}
