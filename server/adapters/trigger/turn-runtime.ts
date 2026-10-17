import { wait } from "@trigger.dev/sdk"
import { chat } from "@trigger.dev/sdk/ai"
import type { TurnRuntime } from "@/server/ports/turn-runtime"

export const triggerTurnRuntime: TurnRuntime = {
  createWait: async (timeoutSec) => {
    const token = await wait.createToken({ timeout: `${timeoutSec}s` })
    return token.id
  },
  completeWait: async (ref) => {
    await wait.completeToken(ref, {})
  },
  waitFor: async (ref) => {
    await wait.forToken(ref)
  },
  write: (chunk) => chat.response.write(chunk),
}
