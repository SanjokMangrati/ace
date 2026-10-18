import { existsSync, readFileSync } from "node:fs"
import { parseEnv } from "node:util"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vitest/config"

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  resolve: { tsconfigPaths: true },
  test: {
    passWithNoTests: true,
    setupFiles: ["./vitest.setup.ts"],
    env:
      mode === "live"
        ? {
            ...(existsSync(".env.local") &&
              parseEnv(readFileSync(".env.local", "utf8"))),
            LIVE_CONTRACTS: "1",
          }
        : {},
    projects: [
      {
        extends: true,
        test: { name: "node", include: ["**/*.test.ts"], environment: "node" },
      },
      {
        extends: true,
        test: { name: "dom", include: ["**/*.test.tsx"], environment: "jsdom" },
      },
    ],
  },
}))
