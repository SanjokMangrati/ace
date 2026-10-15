import { loadEnvConfig } from "@next/env"
import { defineConfig } from "@trigger.dev/sdk"

loadEnvConfig(process.cwd())

const project = process.env.TRIGGER_PROJECT_REF
if (!project) throw new Error("TRIGGER_PROJECT_REF is not set")

export default defineConfig({
  project,
  dirs: ["./trigger"],
  maxDuration: 3600,
  build: {
    conditions: ["react-server"],
  },
})
