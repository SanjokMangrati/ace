import { clockTime } from "@/lib/format"

export function Time({ at, className }: { at?: number; className?: string }) {
  if (at === undefined) return null
  const date = new Date(at)
  return (
    <time
      dateTime={date.toISOString()}
      suppressHydrationWarning
      className={className}
    >
      {clockTime(date)}
    </time>
  )
}
