export function safeRedirect(target: unknown, fallback = "/") {
  if (typeof target !== "string") return fallback
  if (!target.startsWith("/") || target.startsWith("//")) return fallback
  if (target.includes("\\")) return fallback
  return target
}

export function withNext(path: string, next: string) {
  return next === "/" ? path : `${path}?next=${encodeURIComponent(next)}`
}
