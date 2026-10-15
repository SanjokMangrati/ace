"use client"

import { useId } from "react"
import {
  type Control,
  Controller,
  type FieldPath,
  type FieldValues,
} from "react-hook-form"
import { Field, FieldError, FieldTitle } from "@/components/ui/field"
import { SegmentedGroup, SegmentedItem } from "@/components/ui/segmented"

export function SegmentedField<TValues extends FieldValues>({
  control,
  name,
  label,
  options,
  onValueChange,
}: {
  control: Control<TValues>
  name: FieldPath<TValues>
  label: React.ReactNode
  options: { value: string; label: string }[]
  onValueChange?: (value: string) => void
}) {
  const labelId = useId()

  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid}>
          <FieldTitle id={labelId}>{label}</FieldTitle>
          <SegmentedGroup
            aria-labelledby={labelId}
            value={field.value}
            onValueChange={(value) => {
              field.onChange(value)
              onValueChange?.(String(value))
            }}
          >
            {options.map((option) => (
              <SegmentedItem key={option.value} value={option.value}>
                {option.label}
              </SegmentedItem>
            ))}
          </SegmentedGroup>
          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
        </Field>
      )}
    />
  )
}
