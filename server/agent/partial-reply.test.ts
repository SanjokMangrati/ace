import { convertToModelMessages, type UIMessage } from "ai"
import { describe, expect, it } from "vitest"
import { forgetItemIds } from "./partial-reply"

const stopped: UIMessage = {
  id: "reply-1",
  role: "assistant",
  parts: [
    {
      type: "reasoning",
      text: "Checking the totals",
      state: "done",
      providerMetadata: { openai: { itemId: "rs_1", other: "kept" } },
    },
    {
      type: "text",
      text: "The totals match.",
      state: "done",
      providerMetadata: { openai: { itemId: "msg_1" } },
    },
    {
      type: "tool-shell",
      toolCallId: "call-1",
      state: "output-available",
      input: { command: "ls" },
      output: "notes.txt",
      callProviderMetadata: { openai: { itemId: "fc_1" } },
    },
  ],
}

describe("forgetItemIds", () => {
  it("drops every stored item id and keeps the rest", async () => {
    const forgotten = forgetItemIds(stopped)

    expect(JSON.stringify(forgotten)).not.toContain("itemId")
    expect(forgotten.parts[0]).toMatchObject({
      text: "Checking the totals",
      providerMetadata: { openai: { other: "kept" } },
    })
    const model = await convertToModelMessages([forgotten])
    expect(JSON.stringify(model)).not.toContain("itemId")
  })

  it("leaves parts without provider metadata alone", () => {
    const message: UIMessage = {
      id: "you-1",
      role: "user",
      parts: [{ type: "text", text: "Hi" }],
    }

    expect(forgetItemIds(message)).toEqual(message)
  })
})
