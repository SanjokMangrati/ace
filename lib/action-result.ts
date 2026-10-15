import type { z } from "zod"

export const SOMETHING_WENT_WRONG = "Something went wrong. Try again."
export const RELOAD_AND_TRY_AGAIN =
  "Something went wrong. Reload the page and try again."

export type Failure<TField extends string = never> = {
  ok: false
  field?: TField
  message: string
}

export type ActionResult<TField extends string = never> =
  | { ok: true }
  | Failure<TField>

export function fail<TField extends string = never>(
  message: string,
  field?: TField
): Failure<TField> {
  return { ok: false, field, message }
}

export function zodFailure<TField extends string>(
  error: z.ZodError
): Failure<TField> {
  const [issue] = error.issues
  return fail(
    issue.message,
    issue.path.length > 0 ? (issue.path.join(".") as TField) : undefined
  )
}
