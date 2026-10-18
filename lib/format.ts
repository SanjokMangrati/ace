export const DAY_MS = 24 * 60 * 60 * 1000

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function dayLabel(date: Date, now: Date, weekday: "long" | "short") {
  const days = Math.round(
    (startOfDay(now).getTime() - startOfDay(date).getTime()) / DAY_MS
  )
  if (days <= 0) return "Today"
  if (days === 1) return "Yesterday"
  if (days < 7) return date.toLocaleDateString("en-US", { weekday })
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    ...(date.getFullYear() !== now.getFullYear() && { year: "numeric" }),
  })
}

export function friendlyDate(date: Date, now = new Date()) {
  return dayLabel(date, now, "long")
}

export function clockTime(date: Date) {
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  })
}

export function chatTime(date: Date, now = new Date()) {
  const day = dayLabel(date, now, "short")
  return day === "Today" ? clockTime(date) : day
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

export function siteOf(url: string) {
  return URL.parse(url)?.hostname.replace(/^www\./, "") ?? url
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
