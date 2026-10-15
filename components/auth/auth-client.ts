import { createAuthClient } from "better-auth/react"
import { SOMETHING_WENT_WRONG } from "@/lib/action-result"

export const authClient = createAuthClient()

type AuthClientError = {
  status: number
  code?: string
  message?: string
}

export function authErrorMessage(error: AuthClientError) {
  if (error.status === 429) {
    return "Too many attempts. Wait a moment and try again."
  }
  if (error.code === "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL") {
    return "We couldn't create your account. Try signing in or use a different email."
  }
  return error.message || SOMETHING_WENT_WRONG
}
