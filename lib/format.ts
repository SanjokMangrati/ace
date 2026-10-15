const DAY_MS = 24 * 60 * 60 * 1000

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

export function friendlyDate(date: Date, now = new Date()) {
  const days = Math.round(
    (startOfDay(now).getTime() - startOfDay(date).getTime()) / DAY_MS
  )
  if (days <= 0) return "Today"
  if (days === 1) return "Yesterday"
  if (days < 7) return date.toLocaleDateString("en-US", { weekday: "long" })
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    ...(date.getFullYear() !== now.getFullYear() && { year: "numeric" }),
  })
}

export function teammateCount(count: number) {
  return `${count} ${count === 1 ? "teammate" : "teammates"}`
}

export function teammatePictureUrl(bot: {
  id: string
  hasPicture: boolean
  updatedAt: Date
}) {
  return bot.hasPicture
    ? `/api/teammates/${bot.id}/picture?v=${bot.updatedAt.getTime()}`
    : null
}
