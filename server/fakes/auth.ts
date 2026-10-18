import type { AuthPort, AuthUser } from "@/server/ports/auth"

const COOKIE = "fake-session"

export function createFakeAuth(): AuthPort & {
  signIn(user: AuthUser): Headers
} {
  const sessions = new Map<string, AuthUser>()
  return {
    socialProviders: [],
    signUpEnabled: true,
    handle: async () => new Response(null, { status: 404 }),
    getSession: async (headers) => {
      const id = headers
        .get("cookie")
        ?.split(/;\s*/)
        .find((pair) => pair.startsWith(`${COOKIE}=`))
        ?.slice(COOKIE.length + 1)
      const user = id && sessions.get(id)
      return user ? { user } : null
    },
    signIn: (user) => {
      const id = crypto.randomUUID()
      sessions.set(id, user)
      return new Headers({ cookie: `${COOKIE}=${id}` })
    },
  }
}
