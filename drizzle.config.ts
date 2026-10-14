import { loadEnvConfig } from "@next/env"
import { defineConfig } from "drizzle-kit"

loadEnvConfig(process.cwd())

const url = process.env.DATABASE_URL
if (!url) throw new Error("DATABASE_URL is not set")

export default defineConfig({
  schema: "./server/db/schema",
  dialect: "postgresql",
  dbCredentials: { url },
  strict: true,
  verbose: true,
})
