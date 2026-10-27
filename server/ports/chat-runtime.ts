export interface ChatRuntime {
  startSession(chatId: string): Promise<{ publicAccessToken: string }>
  accessToken(chatId: string): Promise<string>
  isRunning(chatId: string): Promise<boolean>
  closeSession(chatId: string, reason: string): Promise<void>
  createWait(timeoutSec: number): Promise<string>
  completeWait(ref: string): Promise<void>
}
