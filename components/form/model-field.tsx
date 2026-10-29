"use client"

import { CaretDownIcon } from "@phosphor-icons/react/ssr"
import { useId, useState } from "react"
import {
  type Control,
  Controller,
  type FieldPath,
  type FieldValues,
} from "react-hook-form"
import { type ModelChoice, ModelMenu } from "@/components/app/model-menu"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldTitle,
} from "@/components/ui/field"
import { SelectOption, selectTriggerClassName } from "@/components/ui/select"

const GROUP = "models"

export function ModelField<TValues extends FieldValues>({
  control,
  name,
  label,
  description,
  choices,
  placeholder = "Pick a model",
  allowTyped = false,
  disabled = false,
  onOpenChange,
}: {
  control: Control<TValues>
  name: FieldPath<TValues>
  label: React.ReactNode
  description?: React.ReactNode
  choices: ModelChoice[]
  placeholder?: string
  allowTyped?: boolean
  disabled?: boolean
  onOpenChange?: (open: boolean) => void
}) {
  const labelId = useId()
  const valueId = useId()
  const [open, setOpen] = useState(false)

  function changeOpen(next: boolean) {
    setOpen(next)
    onOpenChange?.(next)
  }

  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => {
        const value = String(field.value ?? "")
        const listed = choices.some((choice) => choice.id === value)
        const all: ModelChoice[] =
          value && !listed ? [{ id: value, label: value }, ...choices] : choices
        const selected = all.find((choice) => choice.id === value)

        return (
          <Field data-invalid={fieldState.invalid} data-disabled={disabled}>
            <FieldTitle id={labelId}>{label}</FieldTitle>
            <ModelMenu
              open={open}
              onOpenChange={changeOpen}
              trigger={
                <button
                  type="button"
                  ref={field.ref}
                  disabled={disabled}
                  data-disabled={disabled || undefined}
                  aria-labelledby={`${labelId} ${valueId}`}
                  aria-invalid={fieldState.invalid}
                  onBlur={field.onBlur}
                  className={selectTriggerClassName}
                />
              }
              groups={[{ key: GROUP, choices: all, allowTyped }]}
              selected={selected ? { group: GROUP, id: selected.id } : null}
              onPick={({ id }) => {
                field.onChange(id)
                changeOpen(false)
              }}
              contentProps={{
                align: "start",
                "aria-labelledby": labelId,
                className: "w-(--anchor-width)",
              }}
            >
              <span id={valueId} className="flex min-w-0 flex-col">
                {selected ? (
                  <SelectOption
                    label={selected.label}
                    detail={selected.detail}
                  />
                ) : (
                  <span className="truncate text-ink-3">{placeholder}</span>
                )}
              </span>
              <CaretDownIcon
                weight="duotone"
                className="pointer-events-none size-4.5 shrink-0"
              />
            </ModelMenu>
            {description && <FieldDescription>{description}</FieldDescription>}
            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
          </Field>
        )
      }}
    />
  )
}
