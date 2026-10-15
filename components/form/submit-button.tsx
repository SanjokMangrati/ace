"use client"

import { type Control, type FieldValues, useFormState } from "react-hook-form"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"

export function SubmitButton<TValues extends FieldValues>({
  control,
  children,
  className,
  form,
}: {
  control: Control<TValues>
  children: React.ReactNode
  className?: string
  form?: string
}) {
  const { isSubmitting, isSubmitSuccessful } = useFormState({ control })
  const pending = isSubmitting || isSubmitSuccessful

  return (
    <Button type="submit" form={form} disabled={pending} className={className}>
      {pending && <Spinner data-icon="inline-start" />}
      {children}
    </Button>
  )
}
