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

export function clockTime(date: Date) {
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  })
}

export function chatTime(date: Date, now = new Date()) {
  const day = friendlyDate(date, now)
  if (day === "Today") return clockTime(date)
  if (day === "Yesterday") return day
  return day.includes(" ") ? day : day.slice(0, 3)
}

export function workedFor(ms: number) {
  const minutes = Math.round(ms / 60_000)
  if (minutes < 1) return "Worked for under a minute"
  if (minutes < 60) {
    return `Worked for ${minutes} ${minutes === 1 ? "minute" : "minutes"}`
  }
  const hours = Math.round(minutes / 60)
  return `Worked for ${hours} ${hours === 1 ? "hour" : "hours"}`
}

export function usd(amount: number) {
  return amount.toLocaleString("en-US", { style: "currency", currency: "USD" })
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
