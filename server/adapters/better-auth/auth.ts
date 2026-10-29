import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { nextCookies } from "better-auth/next-js"
import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from "@/lib/auth-schemas"
import { db } from "@/server/db/client"
import * as schema from "@/server/db/schema"
import { env } from "@/server/env"
import { demo } from "./demo"

const github =
  !env.DEMO_MODE && env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET
    ? {
        github: {
          clientId: env.GITHUB_CLIENT_ID,
          clientSecret: env.GITHUB_CLIENT_SECRET,
          disableSignUp: env.DISABLE_SIGN_UP,
        },
      }
    : undefined

export const auth = betterAuth({
  appName: "Ace",
  database: drizzleAdapter(db, { provider: "pg", schema }),
  emailAndPassword: {
    enabled: true,
    disableSignUp: env.DISABLE_SIGN_UP || env.DEMO_MODE,
    minPasswordLength: PASSWORD_MIN_LENGTH,
    maxPasswordLength: PASSWORD_MAX_LENGTH,
  },
  socialProviders: { ...github },
  session: {
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60,
    },
  },
  rateLimit: {
    storage: "database",
  },
  plugins: [nextCookies()],
  ...demo,
})
