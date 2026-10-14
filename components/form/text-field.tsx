"use client"

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
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"

type TextFieldProps<TValues extends FieldValues> = Omit<
  React.ComponentProps<typeof Input>,
  "id" | "name" | "value" | "defaultValue" | "onChange" | "onBlur" | "ref"
> & {
  control: Control<TValues>
  name: FieldPath<TValues>
  label: React.ReactNode
  description?: React.ReactNode
}

export function TextField<TValues extends FieldValues>({
  control,
  name,
  label,
  description,
  ...inputProps
}: TextFieldProps<TValues>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid}>
          <FieldLabel htmlFor={field.name}>{label}</FieldLabel>
          <Input
            {...inputProps}
            {...field}
            id={field.name}
            value={field.value ?? ""}
            aria-invalid={fieldState.invalid}
          />
          {fieldState.invalid ? (
            <FieldError errors={[fieldState.error]} />
          ) : (
            description && <FieldDescription>{description}</FieldDescription>
          )}
        </Field>
      )}
    />
  )
}
