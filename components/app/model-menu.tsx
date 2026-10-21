"use client"

import { defaultFilter } from "cmdk"
import { type ComponentProps, type ReactElement, useState } from "react"
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

export type ModelChoice = { id: string; label: string; detail?: string }

type ModelGroup = {
  key: string
  heading?: string
  keywords?: string[]
  choices: ModelChoice[]
  allowTyped?: boolean
}

type ModelPick = { group: string; id: string }

export function modelChoice(
  model: { id: string; label: string; vision: boolean },
  isDefault = false
): ModelChoice {
  const detail = [
    isDefault && "Default",
    !model.vision && "Can't use the screen",
  ]
    .filter(Boolean)
    .join(" · ")
  return { id: model.id, label: model.label, detail: detail || undefined }
}

function itemValue({ group, id }: ModelPick) {
  return `${group}/${id}`
}

export function ModelMenu({
  open,
  onOpenChange,
  trigger,
  children,
  groups,
  selected,
  onPick,
  pending = false,
  error,
  contentProps,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  trigger: ReactElement<Record<string, unknown>>
  children: React.ReactNode
  groups: ModelGroup[]
  selected: ModelPick | null
  onPick: (pick: ModelPick) => void
  pending?: boolean
  error?: string | null
  contentProps?: Omit<
    ComponentProps<typeof ModelSelectorContent>,
    "children" | "commandProps"
  >
}) {
  const [search, setSearch] = useState("")
  const typed = search.trim()

  function changeOpen(next: boolean) {
    onOpenChange(next)
    if (!next) setSearch("")
  }

  return (
    <ModelSelector open={open} onOpenChange={changeOpen}>
      <ModelSelectorTrigger render={trigger}>{children}</ModelSelectorTrigger>
      <ModelSelectorContent
        {...contentProps}
        commandProps={{
          defaultValue: selected ? itemValue(selected) : undefined,
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
          {groups.map((group) => {
            const choices =
              group.allowTyped &&
              typed &&
              !group.choices.some((choice) => choice.id === typed)
                ? [...group.choices, { id: typed, label: `Use “${typed}”` }]
                : group.choices
            return (
              <ModelSelectorGroup key={group.key} heading={group.heading}>
                {choices.map((choice) => {
                  const pick = { group: group.key, id: choice.id }
                  return (
                    <ModelSelectorItem
                      key={choice.id}
                      value={itemValue(pick)}
                      keywords={[
                        choice.label,
                        choice.id,
                        ...(group.keywords ?? []),
                      ]}
                      checked={
                        selected?.group === group.key &&
                        selected.id === choice.id
                      }
                      disabled={pending}
                      onSelect={() => onPick(pick)}
                    >
                      <ModelSelectorName detail={choice.detail}>
                        {choice.label}
                      </ModelSelectorName>
                    </ModelSelectorItem>
                  )
                })}
              </ModelSelectorGroup>
            )
          })}
        </ModelSelectorList>
      </ModelSelectorContent>
    </ModelSelector>
  )
}
