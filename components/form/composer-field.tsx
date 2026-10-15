"use client"

import {
  type Control,
  Controller,
  type FieldPath,
  type FieldValues,
} from "react-hook-form"
import { ComposerTextarea } from "@/components/ui/composer"

export function ComposerField<TValues extends FieldValues>({
  control,
  name,
  ...props
}: Omit<
  React.ComponentProps<typeof ComposerTextarea>,
  "name" | "value" | "onChange" | "onBlur"
> & {
  control: Control<TValues>
  name: FieldPath<TValues>
}) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <ComposerTextarea
          {...props}
          {...field}
          aria-invalid={fieldState.invalid}
        />
      )}
    />
  )
}
