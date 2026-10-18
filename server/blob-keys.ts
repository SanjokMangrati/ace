export const blobKeys = {
  picture: (botId: string) => `teammates/${botId}/picture`,
  teammate: (botId: string) => `teammates/${botId}/`,
  screenshot: (chatId: string, id: string) =>
    `chats/${chatId}/screenshots/${id}`,
  chat: (chatId: string) => `chats/${chatId}/`,
}
