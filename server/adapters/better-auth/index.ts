import type { AuthPort, SocialProvider } from "@/server/ports/auth"
import { auth } from "./auth"

export function createBetterAuthAdapter(): AuthPort {
  const socialProviders = Object.keys(
    auth.options.socialProviders ?? {}
  ) as SocialProvider[]

  return {
    socialProviders,
    signUpEnabled: !auth.options.emailAndPassword.disableSignUp,
    handle: (request) => auth.handler(request),
    async getSession(headers) {
      const result = await auth.api.getSession({ headers })
      if (!result) return null
      const { user } = result
      return {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image ?? null,
        },
      }
    },
  }
}
