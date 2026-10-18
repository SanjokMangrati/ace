import { randomUUID } from "node:crypto"
import { vi } from "vitest"
import { authContract } from "@/server/contracts/auth"
import { createBetterAuthAdapter } from "."

const BASE_URL = vi.hoisted(() => {
  const url = "http://localhost:3000"
  Object.assign(process.env, {
    DATABASE_URL: "postgres://contract@localhost/ace",
    BETTER_AUTH_SECRET: "contract-test-secret-at-least-32-chars",
    BETTER_AUTH_URL: url,
    ENCRYPTION_KEY: Buffer.alloc(32, 1).toString("base64"),
    TRIGGER_SECRET_KEY: "tr_dev_contract",
    DAYTONA_API_KEY: "contract",
  })
  return url
})

vi.mock("@/server/db/client")

authContract("Better Auth", () => {
  const auth = createBetterAuthAdapter()
  return {
    auth,
    signIn: async () => {
      const email = `${randomUUID()}@example.com`
      const response = await auth.handle(
        new Request(`${BASE_URL}/api/auth/sign-up/email`, {
          method: "POST",
          headers: { "content-type": "application/json", origin: BASE_URL },
          body: JSON.stringify({
            name: "Sam",
            email,
            password: "a long enough password",
          }),
        })
      )
      const cookie = response.headers
        .getSetCookie()
        .map((line) => line.split(";")[0])
        .join("; ")
      return { headers: new Headers({ cookie }), email }
    },
  }
})
