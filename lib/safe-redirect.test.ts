import { describe, expect, it } from "vitest"
import { safeRedirect, withNext } from "./safe-redirect"

describe("safeRedirect", () => {
  it("keeps same-origin paths", () => {
    expect(safeRedirect("/chats/123?tab=files")).toBe("/chats/123?tab=files")
  })

  it.each([
    undefined,
    null,
    ["/a"],
    "",
    "chats",
    "https://evil.example",
    "//evil.example",
    "/\\evil.example",
  ])("falls back for %j", (target) => {
    expect(safeRedirect(target)).toBe("/")
  })

  it("uses the given fallback", () => {
    expect(safeRedirect("//evil.example", "/sign-in")).toBe("/sign-in")
  })
})

describe("withNext", () => {
  it("leaves the path alone for the home page", () => {
    expect(withNext("/sign-in", "/")).toBe("/sign-in")
  })

  it("carries the target along", () => {
    expect(withNext("/sign-up", "/chats/1?tab=files")).toBe(
      "/sign-up?next=%2Fchats%2F1%3Ftab%3Dfiles"
    )
  })
})
