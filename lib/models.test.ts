import { describe, expect, it } from "vitest"
import { judgeModelFor } from "./models"

describe("judgeModelFor", () => {
  const model = (id: string, vision = true) => ({
    id,
    label: id,
    vision,
    inputUsdPerMTok: 1,
    outputUsdPerMTok: 1,
  })

  it("picks the newest small model that can see the screen", () => {
    expect(
      judgeModelFor(
        "anthropic",
        [
          model("claude-opus-5-5"),
          model("claude-haiku-5-5"),
          model("claude-haiku-4-5"),
        ],
        "claude-opus-5-5"
      )
    ).toBe("claude-haiku-5-5")
    expect(
      judgeModelFor(
        "openai",
        [model("gpt-6-mini", false), model("gpt-5-mini")],
        "gpt-6"
      )
    ).toBe("gpt-5-mini")
    expect(
      judgeModelFor(
        "google",
        [model("gemini-3-flash-lite"), model("gemini-3-flash")],
        "x"
      )
    ).toBe("gemini-3-flash")
  })

  it("falls back to the bot's model when none fits", () => {
    expect(judgeModelFor("openai_compatible", [], "my-model")).toBe("my-model")
    expect(judgeModelFor("openai", [model("gpt-6")], "gpt-6")).toBe("gpt-6")
  })
})
