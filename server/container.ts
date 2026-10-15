import { createBetterAuthAdapter } from "@/server/adapters/better-auth"
import { createDiceBearAdapter } from "@/server/adapters/dicebear"
import { createEnvKeyVault } from "@/server/adapters/env-key-vault"
import { env } from "@/server/env"
import type { AuthPort } from "@/server/ports/auth"
import type { AvatarPort } from "@/server/ports/avatars"
import type { KeyVault } from "@/server/ports/key-vault"

export const auth: AuthPort = createBetterAuthAdapter()

export const avatars: AvatarPort = createDiceBearAdapter()

export const keyVault: KeyVault = createEnvKeyVault(env.ENCRYPTION_KEY)
