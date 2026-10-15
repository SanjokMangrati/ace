export interface ChatRuntime {
  startSession(chatId: string): Promise<{ publicAccessToken: string }>
  accessToken(chatId: string): Promise<string>
}
