import { loadEnvConfig } from "@next/env"
import { additionalPackages } from "@trigger.dev/build/extensions/core"
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
    extensions: [
      additionalPackages({ packages: ["form-data@4.0.6", "busboy@1.6.0"] }),
    ],
  },
})
