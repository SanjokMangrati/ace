"use client"

import {
  type Control,
  Controller,
  type FieldPath,
  type FieldValues,
} from "react-hook-form"
import { FieldError, FieldLegend, FieldSet } from "@/components/ui/field"
import { PickCard } from "@/components/ui/pick-card"

export function PickField<TValues extends FieldValues>({
  control,
  name,
  label,
  options,
  children,
}: {
  control: Control<TValues>
  name: FieldPath<TValues>
  label: string
  options: {
    value: string
    title: React.ReactNode
    description?: React.ReactNode
    media?: React.ReactNode
  }[]
  children?: React.ReactNode
}) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <FieldSet data-invalid={fieldState.invalid} className="gap-0">
          <FieldLegend className="sr-only">{label}</FieldLegend>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {options.map((option) => {
              const picked: string[] = field.value
              const pressed = picked.includes(option.value)
              return (
                <PickCard
                  key={option.value}
                  pressed={pressed}
                  onClick={() =>
                    field.onChange(
                      pressed
                        ? picked.filter((value) => value !== option.value)
                        : [...picked, option.value]
                    )
                  }
                  media={option.media}
                  title={option.title}
                  description={option.description}
                />
              )
            })}
            {children}
          </div>
          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
        </FieldSet>
      )}
    />
  )
}
