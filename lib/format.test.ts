import { describe, expect, it } from "vitest"
import {
  chatTime,
  friendlyDate,
  siteOf,
  teammateCount,
  usd,
  workedFor,
} from "./format"

const now = new Date(2026, 9, 14, 15, 30)

describe("siteOf", () => {
  it("names the site without www", () => {
    expect(siteOf("https://www.fender.com/products/strat")).toBe("fender.com")
    expect(siteOf("not a url")).toBe("not a url")
  })
})

describe("friendlyDate", () => {
  it("says Today and Yesterday", () => {
    expect(friendlyDate(new Date(2026, 9, 14, 0, 5), now)).toBe("Today")
    expect(friendlyDate(new Date(2026, 9, 13, 23, 59), now)).toBe("Yesterday")
  })

  it("uses the weekday within a week", () => {
    expect(friendlyDate(new Date(2026, 9, 9), now)).toBe("Friday")
  })

  it("uses a short date after a week", () => {
    expect(friendlyDate(new Date(2026, 8, 30), now)).toBe("Sep 30")
  })

  it("adds the year for other years", () => {
    expect(friendlyDate(new Date(2025, 8, 30), now)).toBe("Sep 30, 2025")
  })
})

describe("teammateCount", () => {
  it("pluralizes", () => {
    expect(teammateCount(1)).toBe("1 teammate")
    expect(teammateCount(4)).toBe("4 teammates")
  })
})

describe("chatTime", () => {
  it("shows the time today and a short day before that", () => {
    expect(chatTime(new Date(2026, 9, 14, 14, 4), now)).toBe("2:04 PM")
    expect(chatTime(new Date(2026, 9, 13, 9, 0), now)).toBe("Yesterday")
    expect(chatTime(new Date(2026, 9, 9), now)).toBe("Fri")
    expect(chatTime(new Date(2026, 8, 30), now)).toBe("Sep 30")
  })
})

describe("workedFor", () => {
  it("rounds to friendly units", () => {
    expect(workedFor(20_000)).toBe("Worked for under a minute")
    expect(workedFor(60_000)).toBe("Worked for 1 minute")
    expect(workedFor(12 * 60_000)).toBe("Worked for 12 minutes")
    expect(workedFor(2 * 60 * 60_000)).toBe("Worked for 2 hours")
  })
})

describe("usd", () => {
  it("shows dollars and cents", () => {
    expect(usd(2)).toBe("$2.00")
  })
})
