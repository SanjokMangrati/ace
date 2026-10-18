import { randomUUID } from "node:crypto"
import { describe } from "vitest"
import { liveWith } from "@/server/contracts/live"
import { sandboxContract } from "@/server/contracts/sandbox"
import { createDaytonaSandboxes } from "."

describe.runIf(liveWith("DAYTONA_API_KEY"))(
  "live",
  { timeout: 120_000 },
  () => {
    sandboxContract(
      "Daytona",
      () => ({
        sandboxes: createDaytonaSandboxes(
          process.env.DAYTONA_SNAPSHOT || "ace-desktop"
        ),
        key: `contract-${randomUUID()}`,
        root: "/tmp/ace-contract",
      }),
      600_000
    )
  }
)
