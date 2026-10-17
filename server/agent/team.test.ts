import { describe, expect, it } from "vitest"
import { handoffMessage, type TeammateMessage } from "@/lib/chat"
import { teamPrompt, teamView } from "./team"

const team = [
  { id: "r", name: "Researcher", job: "Finds sources" },
  { id: "p", name: "Planner", job: "Books trips" },
]

const researcherReply: TeammateMessage = {
  id: "a1",
  role: "assistant",
  metadata: { botId: "r" },
  parts: [
    { type: "text", text: "Casa Azul fits best." },
    {
      type: "tool-shell",
      toolCallId: "c1",
      state: "output-available",
      input: {
        purpose: "compare the prices",
        command: "python x.py",
        timeoutSeconds: 120,
      },
      output: { exitCode: 0, output: "secret raw output" },
    },
    {
      type: "tool-fs_write",
      toolCallId: "c2",
      state: "output-error",
      input: { path: "notes.md", content: "x" },
      errorText: "failed",
    },
    {
      type: "tool-web_search",
      toolCallId: "c3",
      state: "output-available",
      input: { query: "casa azul price" },
      output: { results: [] },
    },
    {
      type: "tool-web_fetch",
      toolCallId: "c4",
      state: "output-available",
      input: { url: "https://www.casaazul.example/rooms" },
      output: {
        title: "Rooms",
        url: "https://www.casaazul.example/rooms",
        text: "…",
      },
    },
  ],
}

const handoff = handoffMessage(
  {
    id: "h",
    fromBotId: "r",
    toBotId: "p",
    summary: "Casa Azul is $2,640.",
    nextStep: "Book it.",
  },
  { from: "Researcher", to: "Planner" },
  0
)

describe("teamView", () => {
  it("shows other teammates' replies as attributed text with a summary of their work", () => {
    const [seen] = teamView([researcherReply], "p", team)
    expect(seen.role).toBe("user")
    expect(seen.parts).toEqual([
      {
        type: "text",
        text: "[Researcher]: Casa Azul fits best.\nResearcher also did this on its own computer:\n- ran a command to compare the prices\n- searched the web for casa azul price\n- read casaazul.example",
      },
    ])
  })

  it("keeps a teammate's own replies as they are", () => {
    expect(teamView([researcherReply], "r", team)).toEqual([researcherReply])
  })

  it("addresses a handoff to the teammate who received it", () => {
    const [toPlanner] = teamView([handoff], "p", team)
    expect(toPlanner.parts).toEqual([
      {
        type: "text",
        text: "Researcher passed this to you.\n\nWhat's done: Casa Azul is $2,640.\n\nYour next step: Book it.",
      },
    ])
    expect(teamView([handoff], "r", team)).toEqual([handoff])
  })
})

describe("teamPrompt", () => {
  it("lists the other teammates with their ids", () => {
    const prompt = teamPrompt("p", team)
    expect(prompt).toContain("- Researcher (id r): Finds sources")
    expect(prompt).not.toContain("Planner (id p)")
  })
})
