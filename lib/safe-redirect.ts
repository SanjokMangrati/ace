const ORIGIN = "http://ace.invalid"

export function safeRedirect(target: unknown, fallback = "/") {
  if (typeof target !== "string" || !target.startsWith("/")) return fallback
  return URL.parse(target, ORIGIN)?.origin === ORIGIN ? target : fallback
}

export function withNext(path: string, next: string) {
  return next === "/" ? path : `${path}?next=${encodeURIComponent(next)}`
}
