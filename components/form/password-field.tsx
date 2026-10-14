"use client"

import { EyeIcon } from "@phosphor-icons/react/ssr"
import { useState } from "react"
import {
  type Control,
  Controller,
  type FieldPath,
  type FieldValues,
} from "react-hook-form"
import { Button } from "@/components/ui/button"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"

type PasswordFieldProps<TValues extends FieldValues> = Omit<
  React.ComponentProps<typeof Input>,
  | "id"
  | "name"
  | "type"
  | "value"
  | "defaultValue"
  | "onChange"
  | "onBlur"
  | "ref"
> & {
  control: Control<TValues>
  name: FieldPath<TValues>
  label: React.ReactNode
  description?: React.ReactNode
}

export function PasswordField<TValues extends FieldValues>({
  control,
  name,
  label,
  description,
  ...inputProps
}: PasswordFieldProps<TValues>) {
  const [visible, setVisible] = useState(false)

  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid}>
          <FieldLabel htmlFor={field.name}>{label}</FieldLabel>
          <div className="relative">
            <Input
              {...inputProps}
              {...field}
              id={field.name}
              type={visible ? "text" : "password"}
              value={field.value ?? ""}
              aria-invalid={fieldState.invalid}
              className="pr-12"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={visible ? "Hide password" : "Show password"}
              aria-pressed={visible}
              onClick={() => setVisible((value) => !value)}
              className="absolute top-1 right-1"
            >
              <EyeIcon weight="duotone" />
            </Button>
          </div>
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
