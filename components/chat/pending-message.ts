const key = (chatId: string) => `ace:first-message:${chatId}`

export function setPendingMessage(chatId: string, text: string) {
  sessionStorage.setItem(key(chatId), text)
}

export function takePendingMessage(chatId: string) {
  const text = sessionStorage.getItem(key(chatId))
  sessionStorage.removeItem(key(chatId))
  return text
}
