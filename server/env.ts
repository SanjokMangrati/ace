import { z } from "zod"

const optionalString = z
  .string()
  .optional()
  .transform((value) => value?.trim() || undefined)

const schema = z
  .object({
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    DATABASE_URL: z.url(),
    BETTER_AUTH_SECRET: z.string().min(32),
    BETTER_AUTH_URL: z.url(),
    GITHUB_CLIENT_ID: optionalString,
    GITHUB_CLIENT_SECRET: optionalString,
    DISABLE_SIGN_UP: z.stringbool().default(false),
    ENCRYPTION_KEY: z
      .base64()
      .refine((value) => Buffer.from(value, "base64").length === 32, {
        message:
          "ENCRYPTION_KEY must be 32 random bytes, base64 encoded. Generate one with: openssl rand -base64 32",
      }),
    ALLOW_CUSTOM_BASE_URL: z.stringbool().default(true),
    TRIGGER_SECRET_KEY: z.string().min(1),
  })
  .refine((env) => !env.GITHUB_CLIENT_ID === !env.GITHUB_CLIENT_SECRET, {
    message: "Set both GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET, or neither.",
    path: ["GITHUB_CLIENT_SECRET"],
  })

export const env = schema.parse(process.env)
