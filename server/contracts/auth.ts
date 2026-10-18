import { describe, expect, it } from "vitest"
import type { AuthPort } from "@/server/ports/auth"

type SignedIn = { headers: Headers; email: string }

export function authContract(
  name: string,
  make: () => { auth: AuthPort; signIn: () => Promise<SignedIn> }
) {
  describe(`${name} AuthPort contract`, () => {
    it("has no session without a cookie or with a made-up one", async () => {
      const { auth } = make()
      expect(await auth.getSession(new Headers())).toBeNull()
      expect(
        await auth.getSession(new Headers({ cookie: "session=made-up" }))
      ).toBeNull()
    })

    it("finds the signed-in user from the session cookie", async () => {
      const { auth, signIn } = make()
      const { headers, email } = await signIn()
      const session = await auth.getSession(headers)
      expect(session?.user.email).toBe(email)
    })
  })
}
