import { createAiGatewayCatalog } from "@/server/adapters/ai-gateway"
import { createAiSdkModels } from "@/server/adapters/ai-sdk"
import { createBetterAuthAdapter } from "@/server/adapters/better-auth"
import { createDaytonaSandboxes } from "@/server/adapters/daytona"
import { createDiceBearAdapter } from "@/server/adapters/dicebear"
import { createEnvKeyVault } from "@/server/adapters/env-key-vault"
import { createTriggerChatRuntime } from "@/server/adapters/trigger/chat-runtime"
import { env } from "@/server/env"
import type { AuthPort } from "@/server/ports/auth"
import type { AvatarPort } from "@/server/ports/avatars"
import type { ChatRuntime } from "@/server/ports/chat-runtime"
import type { KeyVault } from "@/server/ports/key-vault"
import type { ModelCatalog } from "@/server/ports/model-catalog"
import type { ModelRegistry } from "@/server/ports/models"
import type { SandboxProvider } from "@/server/ports/sandbox"

export const auth: AuthPort = createBetterAuthAdapter()

export const avatars: AvatarPort = createDiceBearAdapter()

export const keyVault: KeyVault = createEnvKeyVault(env.ENCRYPTION_KEY)

export const modelCatalog: ModelCatalog = createAiGatewayCatalog()

export const models: ModelRegistry = createAiSdkModels()

export const chatRuntime: ChatRuntime = createTriggerChatRuntime()

export const sandboxes: SandboxProvider = createDaytonaSandboxes(
  env.DAYTONA_SNAPSHOT
)
