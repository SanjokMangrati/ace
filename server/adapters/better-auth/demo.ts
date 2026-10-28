import { createAuthMiddleware } from "better-auth/api"
import { DEMO_ACCOUNT } from "@/lib/demo"
import { env } from "@/server/env"

const ensureDemoAccount = createAuthMiddleware(async (ctx) => {
  if (ctx.path !== "/sign-in/email") return
  const { internalAdapter, password } = ctx.context
  if (await internalAdapter.findUserByEmail(DEMO_ACCOUNT.email)) return
  const user = await internalAdapter.createUser(
    {
      name: DEMO_ACCOUNT.name,
      email: DEMO_ACCOUNT.email,
      emailVerified: true,
    },
    { method: "email-password" }
  )
  await internalAdapter.linkAccount({
    userId: user.id,
    providerId: "credential",
    accountId: user.id,
    password: await password.hash(DEMO_ACCOUNT.password),
  })
})

export const demo = env.DEMO_MODE && {
  hooks: { before: ensureDemoAccount },
  disabledPaths: [
    "/change-password",
    "/update-user",
    "/revoke-session",
    "/revoke-sessions",
    "/revoke-other-sessions",
  ],
}
