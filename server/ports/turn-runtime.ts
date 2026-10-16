import type { UIMessageChunk } from "ai"

export interface TurnRuntime {
  waitFor(ref: string): Promise<void>
  write(chunk: UIMessageChunk): void
}
