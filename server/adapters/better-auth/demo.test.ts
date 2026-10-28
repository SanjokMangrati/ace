import { describe, expect, it, vi } from "vitest"
import { DEMO_ACCOUNT } from "@/lib/demo"
import { createBetterAuthAdapter } from "."

const BASE_URL = vi.hoisted(() => {
  const url = "http://localhost:3000"
  Object.assign(process.env, {
    DATABASE_URL: "postgres://demo@localhost/ace",
    BETTER_AUTH_SECRET: "demo-test-secret-at-least-32-chars-long",
    BETTER_AUTH_URL: url,
    ENCRYPTION_KEY: Buffer.alloc(32, 1).toString("base64"),
    TRIGGER_SECRET_KEY: "tr_dev_demo",
    DAYTONA_API_KEY: "demo",
    GITHUB_CLIENT_ID: "github-id",
    GITHUB_CLIENT_SECRET: "github-secret",
    DEMO_MODE: "true",
  })
  return url
})

vi.mock("@/server/db/client")

const auth = createBetterAuthAdapter()

function post(path: string, body: object, cookie = "") {
  return auth.handle(
    new Request(`${BASE_URL}/api/auth${path}`, {
      method: "POST",
      headers: { "content-type": "application/json", origin: BASE_URL, cookie },
      body: JSON.stringify(body),
    })
  )
}

function signIn(password = DEMO_ACCOUNT.password) {
  return post("/sign-in/email", { email: DEMO_ACCOUNT.email, password })
}

describe("Better Auth in demo mode", () => {
  it("offers no sign-up and no GitHub", () => {
    expect(auth.signUpEnabled).toBe(false)
    expect(auth.socialProviders).toEqual([])
  })

  it("creates the demo account on the first sign-in and reuses it", async () => {
    expect((await signIn()).status).toBe(200)
    const again = await signIn()
    expect(again.status).toBe(200)
    expect((await signIn("not the demo password")).status).toBe(401)

    const cookie = again.headers
      .getSetCookie()
      .map((line) => line.split(";")[0])
      .join("; ")
    const session = await auth.getSession(new Headers({ cookie }))
    expect(session?.user.email).toBe(DEMO_ACCOUNT.email)
  })

  it("refuses new accounts and changes to the demo account", async () => {
    const cookie = (await signIn()).headers
      .getSetCookie()
      .map((line) => line.split(";")[0])
      .join("; ")

    const signUp = await post("/sign-up/email", {
      name: "Sam",
      email: "sam@example.com",
      password: "a long enough password",
    })
    expect(signUp.ok).toBe(false)

    for (const path of [
      "/change-password",
      "/update-user",
      "/revoke-sessions",
      "/revoke-other-sessions",
    ]) {
      expect((await post(path, {}, cookie)).status).toBe(404)
    }
    expect((await signIn()).status).toBe(200)
  })
})
