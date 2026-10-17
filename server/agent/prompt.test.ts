import { describe, expect, it } from "vitest"
import { NOTES_BUDGET_CHARS, systemPrompt } from "./prompt"

const bot = {
  name: "Researcher",
  job: "Finds sources",
  instructions: "",
  canSeeScreen: true,
}

describe("systemPrompt", () => {
  it("lists notes with their ids, newest first", () => {
    const prompt = systemPrompt({
      ...bot,
      notes: [
        { id: "n2", content: "Likes tables" },
        { id: "n1", content: "Works in EUR" },
      ],
    })
    expect(prompt).toContain("- [n2] Likes tables\n- [n1] Works in EUR")
    expect(prompt).not.toContain("left out")
  })

  it("drops the oldest notes past the budget and says so", () => {
    const long = "x".repeat(NOTES_BUDGET_CHARS / 2)
    const prompt = systemPrompt({
      ...bot,
      notes: ["a", "b", "c"].map((id) => ({ id, content: long })),
    })
    expect(prompt).toContain("[a]")
    expect(prompt).not.toContain("[b]")
    expect(prompt).toContain("Some older notes were left out")
  })

  it("mentions the screen only when the model can see it", () => {
    expect(systemPrompt({ ...bot, notes: [] })).toContain("computer tool")
    expect(systemPrompt({ ...bot, canSeeScreen: false, notes: [] })).toContain(
      "can't use your computer's screen"
    )
  })

  it("teaches screen habits only when the model can see the screen", () => {
    expect(systemPrompt({ ...bot, notes: [] })).toContain("open_url")
    expect(systemPrompt({ ...bot, notes: [] })).toContain("web_search")
    expect(
      systemPrompt({ ...bot, canSeeScreen: false, notes: [] })
    ).not.toContain("open_url")
  })

  it("adds the person's instructions only when there are some", () => {
    expect(systemPrompt({ ...bot, notes: [] })).not.toContain("How this person")
    expect(
      systemPrompt({ ...bot, instructions: "Be brief.", notes: [] })
    ).toContain("How this person wants you to work:\nBe brief.")
  })
})
