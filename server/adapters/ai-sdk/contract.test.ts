import { describe } from "vitest"
import { liveWith } from "@/server/contracts/live"
import { modelRegistryContract } from "@/server/contracts/models"
import { createAiSdkModels } from "."

describe.runIf(liveWith())("live", { timeout: 120_000 }, () => {
  modelRegistryContract("AI SDK", () => ({
    models: createAiSdkModels(),
    rejected: {
      provider: "anthropic",
      apiKey: "sk-ant-api03-not-a-real-key",
      baseUrl: null,
    },
    modelId: "claude-contract-test",
  }))
})
