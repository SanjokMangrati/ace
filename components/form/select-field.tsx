"use client"

import { useId } from "react"
import {
  type Control,
  Controller,
  type FieldPath,
  type FieldValues,
} from "react-hook-form"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldTitle,
} from "@/components/ui/field"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectOption,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export type SelectFieldOption = {
  value: string
  label: string
  detail?: string
}

export function SelectField<TValues extends FieldValues>({
  control,
  name,
  label,
  description,
  options,
  placeholder,
  disabled,
  onValueChange,
}: {
  control: Control<TValues>
  name: FieldPath<TValues>
  label: React.ReactNode
  description?: React.ReactNode
  options: SelectFieldOption[]
  placeholder: string
  disabled?: boolean
  onValueChange?: (value: string) => void
}) {
  const labelId = useId()

  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => {
        const selected = options.find((option) => option.value === field.value)
        return (
          <Field data-invalid={fieldState.invalid} data-disabled={disabled}>
            <FieldTitle id={labelId}>{label}</FieldTitle>
            <Select
              value={selected ? selected.value : null}
              disabled={disabled}
              onValueChange={(value) => {
                if (typeof value !== "string") return
                field.onChange(value)
                onValueChange?.(value)
              }}
            >
              <SelectTrigger
                ref={field.ref}
                aria-labelledby={labelId}
                aria-invalid={fieldState.invalid}
                onBlur={field.onBlur}
              >
                <SelectValue>
                  {selected ? (
                    <SelectOption
                      label={selected.label}
                      detail={selected.detail}
                    />
                  ) : (
                    <span className="text-ink-3">{placeholder}</span>
                  )}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {options.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      <SelectOption
                        label={option.label}
                        detail={option.detail}
                      />
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
            {fieldState.invalid ? (
              <FieldError errors={[fieldState.error]} />
            ) : (
              description && <FieldDescription>{description}</FieldDescription>
            )}
          </Field>
        )
      }}
    />
  )
}
