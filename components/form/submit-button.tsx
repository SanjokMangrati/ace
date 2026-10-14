"use client"

import { type Control, type FieldValues, useFormState } from "react-hook-form"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"

export function SubmitButton<TValues extends FieldValues>({
  control,
  children,
}: {
  control: Control<TValues>
  children: React.ReactNode
}) {
  const { isSubmitting, isSubmitSuccessful } = useFormState({ control })
  const pending = isSubmitting || isSubmitSuccessful

  return (
    <Button type="submit" disabled={pending}>
      {pending && <Spinner data-icon="inline-start" />}
      {children}
    </Button>
  )
}
