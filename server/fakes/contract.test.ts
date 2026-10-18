import { MockLanguageModelV4 } from "ai/test"
import { authContract } from "@/server/contracts/auth"
import { avatarsContract } from "@/server/contracts/avatars"
import { blobStoreContract } from "@/server/contracts/blob-store"
import { chatRuntimeContract } from "@/server/contracts/chat-runtime"
import { keyVaultContract } from "@/server/contracts/key-vault"
import { loggerContract } from "@/server/contracts/logger"
import { modelCatalogContract } from "@/server/contracts/model-catalog"
import { modelRegistryContract } from "@/server/contracts/models"
import { sandboxContract } from "@/server/contracts/sandbox"
import { telemetryContract } from "@/server/contracts/telemetry"
import { turnRuntimeContract } from "@/server/contracts/turn-runtime"
import { createFakeAuth } from "./auth"
import { createFakeAvatars } from "./avatars"
import { createMemoryBlobStore } from "./blob-store"
import { createFakeChatRuntime } from "./chat-runtime"
import { createFakeKeyVault } from "./key-vault"
import { createMemoryLogger } from "./logger"
import { createFakeModelCatalog } from "./model-catalog"
import { createFakeModels } from "./models"
import { createFakeSandboxes } from "./sandbox"
import { createFakeTelemetry } from "./telemetry"
import { createFakeTurnRuntime } from "./turn-runtime"

authContract("Fake", () => {
  const auth = createFakeAuth()
  return {
    auth,
    signIn: async () => {
      const user = {
        id: "user-1",
        name: "Sam",
        email: "sam@example.com",
        image: null,
      }
      return { headers: auth.signIn(user), email: user.email }
    },
  }
})

avatarsContract("Fake", createFakeAvatars)

blobStoreContract("Memory", createMemoryBlobStore)

chatRuntimeContract("Fake", () =>
  createFakeChatRuntime(createFakeTurnRuntime())
)

keyVaultContract("Fake", createFakeKeyVault)

loggerContract("Memory", () => {
  const logger = createMemoryLogger()
  return {
    logger,
    lines: () =>
      logger.entries.map(({ message, fields }) => ({
        msg: message,
        ...fields,
      })),
  }
})

modelCatalogContract("Fake", () =>
  createFakeModelCatalog({
    anthropic: [
      {
        id: "claude-test",
        label: "Claude Test",
        vision: true,
        inputUsdPerMTok: 1,
        outputUsdPerMTok: 5,
      },
    ],
  })
)

modelRegistryContract("Fake", () => ({
  models: createFakeModels({
    model: (modelId) => new MockLanguageModelV4({ modelId }),
    rejectedKeys: ["sk-refused"],
  }),
  rejected: { provider: "anthropic", apiKey: "sk-refused", baseUrl: null },
  modelId: "claude-test",
}))

sandboxContract("Fake", () => ({
  sandboxes: createFakeSandboxes(),
  key: "bot-1",
  root: "/home/ace/workspace",
}))

telemetryContract("Fake", createFakeTelemetry)

turnRuntimeContract("Fake", createFakeTurnRuntime)
