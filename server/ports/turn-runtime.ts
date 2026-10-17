import type { UIMessage, UIMessageChunk } from "ai"

export interface TurnRuntime {
  createWait(timeoutSec: number): Promise<string>
  completeWait(ref: string): Promise<void>
  waitFor(ref: string): Promise<void>
  write(chunk: UIMessageChunk): void
  send(chatId: string, message: UIMessage): Promise<void>
}
