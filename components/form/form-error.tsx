"use client"

import { type Control, type FieldValues, useFormState } from "react-hook-form"
import { ErrorNotice } from "@/components/app/error-notice"

export function FormError<TValues extends FieldValues>({
  control,
  initialMessage,
}: {
  control: Control<TValues>
  initialMessage?: string
}) {
  const { errors, isSubmitted } = useFormState({ control })
  const message =
    errors.root?.message ?? (isSubmitted ? undefined : initialMessage)
  if (!message) return null

  return <ErrorNotice message={message} />
}
