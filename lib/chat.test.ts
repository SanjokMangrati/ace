import { describe, expect, it } from "vitest"
import { chatTitle } from "./chat"

describe("chatTitle", () => {
  it("uses the first line of the message", () => {
    expect(chatTitle("  Sort my receipts\nby month please")).toBe(
      "Sort my receipts"
    )
  })

  it("cuts long messages at a word and adds an ellipsis", () => {
    const title = chatTitle(`${"word ".repeat(30)}end`)
    expect(title.endsWith("word…")).toBe(true)
    expect(title.length).toBeLessThanOrEqual(81)
  })
})
