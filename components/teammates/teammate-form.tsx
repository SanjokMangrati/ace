"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { InfoIcon } from "@phosphor-icons/react/ssr"
import { useEffect, useMemo, useState } from "react"
import { flushSync } from "react-dom"
import { type FieldErrors, useForm, useWatch } from "react-hook-form"
import { createTeammate, updateTeammate } from "@/app/(app)/teammates/actions"
import { Section } from "@/components/app/page"
import { useCloseModal } from "@/components/app/route-modal"
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
import { Alert, AlertDescription } from "@/components/ui/alert"
import { TeammateAvatar } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  DialogBody,
  DialogClose,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { callAction, setActionError } from "@/lib/action-client"
import {
  ADVANCED_FIELDS,
  NEW_KEY,
  type TeammateFormInput,
  type TeammateLimits,
  teammateFormSchema,
} from "@/lib/bot-schemas"
import {
  defaultModelId,
  type Provider,
  type ProviderModels,
} from "@/lib/models"
import type { ProviderKeyOption } from "@/lib/provider-display"
import { findPreset, type TeammatePreset } from "@/lib/teammate-presets"
import { cn } from "@/lib/utils"
import { AskBefore } from "./ask-before"
import { checkPicture, PictureField } from "./picture-field"
import { PresetPicker } from "./preset-picker"

const FORM_ID = "teammate-form"
const ADVANCED = "advanced"

function usePicturePreview(file: File | null) {
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => {
    if (!file) {
      setUrl(null)
      return
    }
    const objectUrl = URL.createObjectURL(file)
    setUrl(objectUrl)
    return () => URL.revokeObjectURL(objectUrl)
  }, [file])
  return url
}

export function TeammateForm({
  mode,
  botId,
  savedName,
  savedPicture,
  defaultValues,
  providerKeys,
  models,
  allowCustom,
  limits,
  showAdvanced = false,
  children,
}: {
  mode: "create" | "edit"
  botId: string
  savedName: string
  savedPicture: string | null
  defaultValues: TeammateFormInput
  providerKeys: ProviderKeyOption[]
  models: ProviderModels
  allowCustom: boolean
  limits: TeammateLimits
  showAdvanced?: boolean
  children?: React.ReactNode
}) {
  const closeModal = useCloseModal()
  const resolver = useMemo(
    () => zodResolver(teammateFormSchema(limits)),
    [limits]
  )
  const form = useForm<TeammateFormInput>({
    resolver,
    defaultValues,
  })
  const [advanced, setAdvanced] = useState(showAdvanced ? [ADVANCED] : [])
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
  const modelId = useWatch({ control: form.control, name: "modelId" })

  const displayName = watchedName.trim() || savedName
  const name = displayName || "Your teammate"
  const nameInSentence = displayName || "your teammate"
  const addingKey = providerKeyId === NEW_KEY
  const provider: Provider | undefined = addingKey
    ? newKeyProvider
    : providerKeys.find((key) => key.id === providerKeyId)?.provider
  const catalog = provider ? models[provider] : []
  const blindModel =
    Boolean(provider && modelId) &&
    !catalog.some((model) => model.id === modelId && model.vision)

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

  function inCatalog(of: Provider, modelId: string) {
    return models[of].some((model) => model.id === modelId)
  }

  function syncModel(next: Provider | undefined) {
    if (!next) return
    const current = form.getValues("modelId")
    if (models[next].length > 0) {
      if (!inCatalog(next, current)) {
        form.setValue("modelId", defaultModelId(models[next]))
      }
    } else if (provider && inCatalog(provider, current)) {
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
    const result = await callAction(() => save(formData))
    if (result.ok) return closeModal()
    const { field, message } = result
    if (field === "picture") {
      setPictureError(message)
      form.setError("root.picture", { message })
      return
    }
    if (
      field &&
      ADVANCED_FIELDS.some((advancedField) => field.startsWith(advancedField))
    ) {
      openAdvanced()
    }
    setActionError(form, { ...result, field })
  }

  return (
    <>
      <DialogHeader className="flex-row items-center gap-3">
        <TeammateAvatar botId={botId} name={name} picture={picture} size="md" />
        <div className="min-w-0">
          <DialogTitle id="teammate-title" className="truncate">
            {displayName || "New teammate"}
          </DialogTitle>
          {watchedJob.trim() && (
            <p className="truncate text-small text-ink-2">
              {watchedJob.trim()}
            </p>
          )}
        </div>
      </DialogHeader>
      <DialogBody className="flex flex-col gap-5">
        <form
          id={FORM_ID}
          onSubmit={form.handleSubmit(onSubmit, onInvalid)}
          noValidate
          aria-labelledby="teammate-title"
          className="flex flex-col gap-5"
        >
          <FormError control={form.control} />

          {mode === "create" && (
            <Section id="s-preset" title="Start from an example">
              <PresetPicker selected={preset?.id} onPick={pickPreset} />
            </Section>
          )}

          <Section id="s-profile" title="Profile">
            <Card className="gap-3.5 px-4">
              <PictureField
                hasPicture={picture !== null}
                error={pictureError}
                onPick={pickPicture}
                onRemove={removePicture}
              />
              <div className="grid gap-4 sm:grid-cols-2">
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
              </div>
              <TextareaField
                control={form.control}
                name="instructions"
                label="Instructions"
                rows={4}
              />
            </Card>
          </Section>

          <Section id="s-model" title="AI model">
            <Card
              className={cn(
                "grid gap-3.5 px-4",
                !addingKey && "sm:grid-cols-2"
              )}
            >
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
              {blindModel && (
                <Alert className="sm:col-span-2">
                  <InfoIcon weight="duotone" />
                  <AlertDescription>
                    With this model, {nameInSentence} can't see or use its
                    screen, so it works only through commands and files. Pick a
                    model that can see screens to let it use apps and websites.
                  </AlertDescription>
                </Alert>
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
                className="flex flex-col gap-5 pt-3"
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
                  <Card className="gap-3 px-4">
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
      </DialogBody>
      <DialogFooter>
        {mode === "edit" && (
          <span className="mr-auto text-small text-ink-3">
            Changes apply from {savedName}'s next task.
          </span>
        )}
        <DialogClose render={<Button variant="ghost" />}>Cancel</DialogClose>
        <SubmitButton control={form.control} form={FORM_ID}>
          {mode === "create" ? "Create teammate" : "Save changes"}
        </SubmitButton>
      </DialogFooter>
    </>
  )
}
