import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"
import type { QueueEvent, TeammateMessage } from "@/lib/chat"
import { TeammateReply } from "./chat-message"

const teammate = {
  id: "bot-1",
  name: "Researcher",
  picture: null,
  connected: true,
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
        message={reply({ ...queue, waitingOn: "you" })}
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
