import { describe } from "vitest"
import { liveWith } from "@/server/contracts/live"
import { modelCatalogContract } from "@/server/contracts/model-catalog"
import { createAiGatewayCatalog } from "."

describe.runIf(liveWith())("live", { timeout: 120_000 }, () => {
  modelCatalogContract("AI Gateway", createAiGatewayCatalog)
})
