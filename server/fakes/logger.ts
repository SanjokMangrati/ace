import type { Logger } from "@/server/ports/logger"

type LogEntry = {
  level: "info" | "warn" | "error"
  message: string
  fields: Record<string, unknown>
}

type MemoryLogger = Logger & { entries: LogEntry[] }

export function createMemoryLogger(
  entries: LogEntry[] = [],
  bound: Record<string, unknown> = {}
): MemoryLogger {
  const write =
    (level: LogEntry["level"]) =>
    (message: string, fields: Record<string, unknown> = {}) => {
      entries.push({ level, message, fields: { ...bound, ...fields } })
    }
  return {
    entries,
    info: write("info"),
    warn: write("warn"),
    error: write("error"),
    child: (fields) => createMemoryLogger(entries, { ...bound, ...fields }),
  }
}
