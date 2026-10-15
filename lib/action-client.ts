import { unstable_rethrow } from "next/navigation"
import { useState, useTransition } from "react"
import type { FieldPath, FieldValues, UseFormReturn } from "react-hook-form"
import {
  type ActionResult,
  type Failure,
  fail,
  SOMETHING_WENT_WRONG,
} from "@/lib/action-result"

export async function callAction<TResult extends ActionResult<string>>(
  call: () => Promise<TResult>
): Promise<TResult | Failure> {
  try {
    return await call()
  } catch (error) {
    unstable_rethrow(error)
    return fail<never>(SOMETHING_WENT_WRONG)
  }
}

export function setActionError<TValues extends FieldValues>(
  form: UseFormReturn<TValues>,
  { field, message }: Failure<FieldPath<TValues>>
) {
  form.setError(field ?? "root", { message }, { shouldFocus: true })
}

export function useAction() {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function run(call: () => Promise<ActionResult<string>>, onDone?: () => void) {
    setError(null)
    startTransition(async () => {
      const result = await callAction(call)
      if (result.ok) onDone?.()
      else setError(result.message)
    })
  }

  return { pending, error, run }
}
