import { describe, expect, it } from "vitest"
import { safeRedirect } from "./safe-redirect"

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
