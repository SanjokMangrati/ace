"use client"

import { CaretDownIcon } from "@phosphor-icons/react/ssr"
import { defaultFilter } from "cmdk"
import { useState } from "react"
import {
  ModelSelector,
  ModelSelectorContent,
  ModelSelectorEmpty,
  ModelSelectorGroup,
  ModelSelectorInput,
  ModelSelectorItem,
  ModelSelectorList,
  ModelSelectorName,
  ModelSelectorTrigger,
} from "@/components/ai-elements/model-selector"
import { ErrorNotice } from "@/components/app/error-notice"
import { Button } from "@/components/ui/button"
import { useAction } from "@/lib/action-client"
import type { ActionResult } from "@/lib/action-result"
import type { PickedModel } from "@/lib/chat-schemas"
import type { ProviderKeyModels } from "@/lib/provider-display"

export type ChatModel = {
  providerKeyId: string | null
  modelId: string
  defaultProviderKeyId: string | null
  defaultModelId: string
}

type Choice = { id: string; label: string; vision: boolean }

function itemValue(keyId: string, modelId: string) {
  return `${keyId}/${modelId}`
}

export function ModelPicker({
  teammate,
  providerKeys,
  onPick,
}: {
  teammate: { name: string; model: ChatModel }
  providerKeys: ProviderKeyModels[]
  onPick: (model: PickedModel) => Promise<ActionResult<string>>
}) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")
  const { pending, error, run } = useAction()
  const { name, model } = teammate
  const typed = search.trim()

  function choicesFor(key: ProviderKeyModels): Choice[] {
    if (key.provider !== "openai_compatible") return key.models
    const listed = new Set(key.models.map((choice) => choice.id))
    const saved = [
      model.providerKeyId === key.id && model.modelId,
      model.defaultProviderKeyId === key.id && model.defaultModelId,
    ].filter(
      (id): id is string =>
        typeof id === "string" && id !== "" && !listed.has(id)
    )
    const choices: Choice[] = [
      ...[...new Set(saved)].map((id) => ({ id, label: id, vision: false })),
      ...key.models,
    ]
    if (typed && !choices.some((choice) => choice.id === typed)) {
      choices.push({ id: typed, label: `Use “${typed}”`, vision: false })
    }
    return choices
  }

  const current = providerKeys.find((key) => key.id === model.providerKeyId)
  const currentLabel = current
    ? (current.models.find((choice) => choice.id === model.modelId)?.label ??
      model.modelId)
    : "Pick a model"

  function pick(keyId: string, modelId: string) {
    if (keyId === model.providerKeyId && modelId === model.modelId) {
      setOpen(false)
      return
    }
    run(
      () => onPick({ providerKeyId: keyId, modelId }),
      () => setOpen(false)
    )
  }

  return (
    <ModelSelector
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) setSearch("")
      }}
    >
      <ModelSelectorTrigger
        render={
          <Button type="button" variant="ghost" size="sm" className="min-w-0" />
        }
      >
        <span className="sr-only">{name}'s AI model: </span>
        <span className="truncate">{currentLabel}</span>
        <CaretDownIcon weight="duotone" data-icon="inline-end" />
      </ModelSelectorTrigger>
      <ModelSelectorContent
        side="top"
        align="end"
        aria-label={`${name}'s AI model`}
        commandProps={{
          defaultValue:
            model.providerKeyId === null
              ? undefined
              : itemValue(model.providerKeyId, model.modelId),
          filter: (_value, query, keywords) =>
            defaultFilter(keywords?.join(" ") ?? "", query),
        }}
      >
        <ModelSelectorInput
          value={search}
          onValueChange={setSearch}
          placeholder="Search models"
        />
        {error && <ErrorNotice message={error} className="mx-3 mt-3" />}
        <ModelSelectorList>
          <ModelSelectorEmpty>No model matches that.</ModelSelectorEmpty>
          {providerKeys.map((key) => (
            <ModelSelectorGroup
              key={key.id}
              heading={
                providerKeys.length > 1
                  ? `${key.label} · ${key.detail}`
                  : undefined
              }
            >
              {choicesFor(key).map((choice) => {
                const isDefault =
                  key.id === model.defaultProviderKeyId &&
                  choice.id === model.defaultModelId
                const detail = [
                  isDefault && "Default",
                  !choice.vision && "Can't use the screen",
                ]
                  .filter(Boolean)
                  .join(" · ")
                return (
                  <ModelSelectorItem
                    key={choice.id}
                    value={itemValue(key.id, choice.id)}
                    keywords={[choice.label, choice.id, key.label]}
                    checked={
                      key.id === model.providerKeyId &&
                      choice.id === model.modelId
                    }
                    disabled={pending}
                    onSelect={() => pick(key.id, choice.id)}
                  >
                    <ModelSelectorName detail={detail}>
                      {choice.label}
                    </ModelSelectorName>
                  </ModelSelectorItem>
                )
              })}
            </ModelSelectorGroup>
          ))}
        </ModelSelectorList>
      </ModelSelectorContent>
    </ModelSelector>
  )
}
