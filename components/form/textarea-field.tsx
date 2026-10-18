"use client"

import {
  type Control,
  Controller,
  type FieldPath,
  type FieldValues,
} from "react-hook-form"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Textarea } from "@/components/ui/textarea"

type TextareaFieldProps<TValues extends FieldValues> = Omit<
  React.ComponentProps<typeof Textarea>,
  "id" | "name" | "value" | "defaultValue" | "onChange" | "onBlur" | "ref"
> & {
  control: Control<TValues>
  name: FieldPath<TValues>
  label: React.ReactNode
}

export function TextareaField<TValues extends FieldValues>({
  control,
  name,
  label,
  ...textareaProps
}: TextareaFieldProps<TValues>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid}>
          <FieldLabel htmlFor={field.name}>{label}</FieldLabel>
          <Textarea
            {...textareaProps}
            {...field}
            id={field.name}
            value={field.value ?? ""}
            aria-invalid={fieldState.invalid}
          />
          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
        </Field>
      )}
    />
  )
}
