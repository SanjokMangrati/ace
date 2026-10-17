import { describe, expect, it } from "vitest"
import {
  chatTitle,
  handoffMessage,
  mentionedTeammate,
  nameList,
  nextTeammate,
  splitMentions,
  type TeammateMessage,
} from "./chat"

const team = [
  { id: "r", name: "Researcher" },
  { id: "w", name: "Writer" },
  { id: "a", name: "Ann" },
  { id: "aa", name: "Anna" },
]

function said(text: string): TeammateMessage {
  return { id: "m", role: "user", parts: [{ type: "text", text }] }
}

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

describe("nameList", () => {
  it("joins names the way people say them", () => {
    expect(nameList(["Researcher"])).toBe("Researcher")
    expect(nameList(["Researcher", "Writer"])).toBe("Researcher and Writer")
    expect(nameList(["Researcher", "Planner", "Writer"])).toBe(
      "Researcher, Planner and Writer"
    )
  })
})

describe("mentionedTeammate", () => {
  it("picks the first teammate mentioned, ignoring case", () => {
    expect(mentionedTeammate("ask @writer, then @Researcher", team)?.id).toBe(
      "w"
    )
  })

  it("matches whole names only", () => {
    expect(mentionedTeammate("@Anna please", team)?.id).toBe("aa")
    expect(mentionedTeammate("@Ann, please", team)?.id).toBe("a")
    expect(mentionedTeammate("@Writers", team)).toBeUndefined()
  })
})

describe("splitMentions", () => {
  it("marks each mention with its place in the text", () => {
    expect(splitMentions("@Writer draft it for @Ann", team)).toEqual([
      { at: 0, text: "@Writer", mention: true },
      { at: 7, text: " draft it for ", mention: false },
      { at: 21, text: "@Ann", mention: true },
    ])
  })
})

describe("nextTeammate", () => {
  it("routes a handoff to the teammate it was passed to", () => {
    const message = handoffMessage(
      {
        id: "h",
        fromBotId: "r",
        toBotId: "w",
        summary: "Found three venues.",
        nextStep: "Write to Casa Azul.",
      },
      { from: "Researcher", to: "Writer" },
      0
    )
    expect(nextTeammate(message, team, "r").id).toBe("w")
  })

  it("routes a hand-back to the teammate whose screen it was", () => {
    const message = {
      ...said("I'm done with your screen"),
      metadata: { control: { tookAt: 0, gaveAt: 1, botId: "w" } },
    }
    expect(nextTeammate(message, team, "r").id).toBe("w")
  })

  it("prefers a mention, then the last active teammate, then the first", () => {
    expect(nextTeammate(said("@Writer go"), team, "r").id).toBe("w")
    expect(nextTeammate(said("go on"), team, "a").id).toBe("a")
    expect(nextTeammate(said("go on"), team, null).id).toBe("r")
    expect(nextTeammate(said("go on"), team, "gone").id).toBe("r")
  })
})
