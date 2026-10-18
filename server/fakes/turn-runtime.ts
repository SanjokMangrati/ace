import type { UIMessage, UIMessageChunk } from "ai"
import type { TurnRuntime } from "@/server/ports/turn-runtime"

type Wait = { timeoutSec: number; done: Promise<void>; finish: () => void }

type FakeTurnRuntime = TurnRuntime & {
  waits: Map<string, Wait>
  chunks: UIMessageChunk[]
  sent: { chatId: string; message: UIMessage }[]
  expire(ref: string): void
}

export function createFakeTurnRuntime(): FakeTurnRuntime {
  const waits = new Map<string, Wait>()
  const chunks: UIMessageChunk[] = []
  const sent: FakeTurnRuntime["sent"] = []
  const finish = (ref: string) => waits.get(ref)?.finish()
  return {
    waits,
    chunks,
    sent,
    expire: finish,
    createWait: async (timeoutSec) => {
      const ref = `wait-${waits.size + 1}`
      const { promise, resolve } = Promise.withResolvers<void>()
      waits.set(ref, { timeoutSec, done: promise, finish: resolve })
      return ref
    },
    completeWait: async (ref) => finish(ref),
    waitFor: async (ref) => {
      await waits.get(ref)?.done
    },
    write: (chunk) => {
      chunks.push(chunk)
    },
    send: async (chatId, message) => {
      sent.push({ chatId, message })
    },
  }
}
