import { createBetterAuthAdapter } from "@/server/adapters/better-auth"
import { createDiceBearAdapter } from "@/server/adapters/dicebear"
import type { AuthPort } from "@/server/ports/auth"
import type { AvatarPort } from "@/server/ports/avatars"

export const auth: AuthPort = createBetterAuthAdapter()

export const avatars: AvatarPort = createDiceBearAdapter()
