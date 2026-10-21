"use client"

import { CaretDownIcon } from "@phosphor-icons/react/ssr"
import { useState } from "react"
import {
  type ModelChoice,
  ModelMenu,
  modelChoice,
} from "@/components/app/model-menu"
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
  const { pending, error, run } = useAction()
  const { name, model } = teammate

  function choicesFor(key: ProviderKeyModels): ModelChoice[] {
    const isDefault = (id: string) =>
      key.id === model.defaultProviderKeyId && id === model.defaultModelId
    const listed = key.models.map((choice) =>
      modelChoice(choice, isDefault(choice.id))
    )
    if (key.provider !== "openai_compatible") return listed
    const known = new Set(key.models.map((choice) => choice.id))
    const saved = [
      model.providerKeyId === key.id && model.modelId,
      model.defaultProviderKeyId === key.id && model.defaultModelId,
    ].filter(
      (id): id is string =>
        typeof id === "string" && id !== "" && !known.has(id)
    )
    return [
      ...[...new Set(saved)].map((id) =>
        modelChoice({ id, label: id, vision: false }, isDefault(id))
      ),
      ...listed,
    ]
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
    <ModelMenu
      open={open}
      onOpenChange={setOpen}
      trigger={
        <Button type="button" variant="ghost" size="sm" className="min-w-0" />
      }
      groups={providerKeys.map((key) => ({
        key: key.id,
        heading:
          providerKeys.length > 1 ? `${key.label} · ${key.detail}` : undefined,
        keywords: [key.label],
        choices: choicesFor(key),
        allowTyped: key.provider === "openai_compatible",
      }))}
      selected={
        model.providerKeyId === null
          ? null
          : { group: model.providerKeyId, id: model.modelId }
      }
      onPick={({ group, id }) => pick(group, id)}
      pending={pending}
      error={error}
      contentProps={{
        side: "top",
        align: "end",
        "aria-label": `${name}'s AI model`,
      }}
    >
      <span className="sr-only">{name}'s AI model: </span>
      <span className="truncate">{currentLabel}</span>
      <CaretDownIcon weight="duotone" data-icon="inline-end" />
    </ModelMenu>
  )
}
