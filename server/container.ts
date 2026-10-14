import { createBetterAuthAdapter } from "@/server/adapters/better-auth"
import type { AuthPort } from "@/server/ports/auth"

export const auth: AuthPort = createBetterAuthAdapter()
