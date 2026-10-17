export function shellQuote(text: string) {
  return `'${text.replaceAll("'", "'\\''")}'`
}
