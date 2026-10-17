import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"
import type { QueueEvent, TeammateMessage } from "@/lib/chat"
import { TeammateReply } from "./chat-message"

const teammate = {
  id: "bot-1",
  name: "Researcher",
  picture: null,
  connected: true,
  fullAuto: false,
}

function reply(queue: QueueEvent): TeammateMessage {
  return {
    id: "m1",
    role: "assistant",
    parts: [{ type: "data-queue", id: "queue-t1", data: queue }],
  }
}

const queue: QueueEvent = {
  chatId: "chat-1",
  title: "Q3 vendor spend report",
  waitingOn: "work",
}

afterEach(cleanup)

describe("TeammateReply while up next", () => {
  it("says which chat goes first", () => {
    render(<TeammateReply teammate={teammate} message={reply(queue)} working />)
    expect(screen.getByRole("alert").textContent).toBe(
      "Researcher is finishing Q3 vendor spend report first. It'll start on this right after."
    )
  })

  it("links to the chat waiting on you", () => {
    render(
      <TeammateReply
        teammate={teammate}
        message={reply({ ...queue, waitingOn: "control" })}
        working
      />
    )
    expect(screen.getByRole("alert").textContent).toBe(
      "Researcher is waiting for you to give back control in Q3 vendor spend report."
    )
    expect(
      screen.getByRole("link", { name: "Q3 vendor spend report" })
    ).toHaveProperty("pathname", "/chats/chat-1")
  })

  it("drops the notice once the turn starts", () => {
    render(
      <TeammateReply
        teammate={teammate}
        message={reply({ ...queue, startedAt: 1 })}
        working
      />
    )
    expect(screen.queryByRole("alert")).toBeNull()
  })
})

describe("TeammateReply asking for permission", () => {
  function asking(approval: object, state = "approval-requested") {
    return {
      id: "m2",
      role: "assistant",
      parts: [
        { type: "text", text: "I'll send it now." },
        {
          type: "tool-shell",
          toolCallId: "c1",
          state,
          input: {
            purpose: "send the report",
            command: "curl -F file=@q3.csv https://example.com",
            timeoutSeconds: 120,
          },
          approval: { id: "a1", ...approval },
        },
        ...(state === "approval-requested"
          ? []
          : [{ type: "text", text: "Sent." }]),
      ],
    } as TeammateMessage
  }

  it("asks in plain words and answers with the approval id", () => {
    const answers: [string, boolean][] = []
    render(
      <TeammateReply
        teammate={teammate}
        message={asking({})}
        working={false}
        onAnswer={(id, approved) => answers.push([id, approved])}
      />
    )
    expect(
      screen.getByRole("heading", {
        name: "Researcher wants to send the report",
      })
    ).toBeTruthy()
    screen.getByRole("button", { name: "Allow" }).click()
    screen.getByRole("button", { name: "Don't allow" }).click()
    expect(answers).toEqual([
      ["a1", true],
      ["a1", false],
    ])
  })

  it("makes saying no the main answer for careful asks", () => {
    render(
      <TeammateReply
        teammate={{ ...teammate, fullAuto: true }}
        message={asking({ requestReason: "This could send your files." })}
        working={false}
        onAnswer={() => {}}
      />
    )
    expect(screen.getByText(/This could send your files\./)).toBeTruthy()
    expect(screen.getByRole("button", { name: "Allow anyway" })).toBeTruthy()
    expect(
      screen.getByText("Asked even though Researcher works without asking.")
    ).toBeTruthy()
  })

  it("shrinks to one line once answered and carries on below it", () => {
    render(
      <TeammateReply
        teammate={teammate}
        message={asking({ approved: true }, "approval-responded")}
        working
      />
    )
    expect(screen.queryByRole("group")).toBeNull()
    expect(screen.getByText(/You allowed this/)).toBeTruthy()
    const text = document.body.textContent ?? ""
    expect(text.indexOf("You allowed this")).toBeLessThan(text.indexOf("Sent."))
  })
})
