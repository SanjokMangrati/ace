import { getSessionCookie } from "better-auth/cookies"

export function hasSessionCookie(headers: Headers) {
  return getSessionCookie(headers) !== null
}
