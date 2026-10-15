import { createAiGatewayCatalog } from "@/server/adapters/ai-gateway"
import { createBetterAuthAdapter } from "@/server/adapters/better-auth"
import { createDiceBearAdapter } from "@/server/adapters/dicebear"
import { createEnvKeyVault } from "@/server/adapters/env-key-vault"
import { createTriggerChatRuntime } from "@/server/adapters/trigger/chat-runtime"
import { env } from "@/server/env"
import type { AuthPort } from "@/server/ports/auth"
import type { AvatarPort } from "@/server/ports/avatars"
import type { ChatRuntime } from "@/server/ports/chat-runtime"
import type { KeyVault } from "@/server/ports/key-vault"
import type { ModelCatalog } from "@/server/ports/model-catalog"

export const auth: AuthPort = createBetterAuthAdapter()

export const avatars: AvatarPort = createDiceBearAdapter()

export const keyVault: KeyVault = createEnvKeyVault(env.ENCRYPTION_KEY)

export const modelCatalog: ModelCatalog = createAiGatewayCatalog()

export const chatRuntime: ChatRuntime = createTriggerChatRuntime()
