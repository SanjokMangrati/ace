import { describe, expect, it } from "vitest"
import { friendlyDate, teammateCount } from "./format"

const now = new Date(2026, 9, 14, 15, 30)

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
