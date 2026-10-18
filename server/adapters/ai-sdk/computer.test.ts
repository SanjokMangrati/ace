import { describe, expect, it } from "vitest"
import { anthropicComputerTool, toComputerAction } from "./computer"

const handlers = {
  execute: async () => ({ cursor: { x: 0, y: 0 } }),
  toModelOutput: async () => ({ type: "text" as const, value: "" }),
}

describe("toComputerAction", () => {
  it("maps clicks with held keys", () => {
    expect(
      toComputerAction({
        action: "double_click",
        coordinate: [10, 20],
        text: "ctrl+shift",
      })
    ).toEqual({
      type: "click",
      x: 10,
      y: 20,
      button: "left",
      clicks: 2,
      modifiers: ["ctrl", "shift"],
    })
  })

  it("drags from the start coordinate", () => {
    expect(
      toComputerAction({
        action: "left_click_drag",
        start_coordinate: [1, 2],
        coordinate: [3, 4],
      })
    ).toEqual({ type: "drag", fromX: 1, fromY: 2, x: 3, y: 4 })
  })

  it("keeps the key repeat", () => {
    expect(
      toComputerAction({ action: "key", text: "Down", repeat: 3 })
    ).toEqual({ type: "key", keys: "Down", repeat: 3 })
  })

  it("refuses actions Ace doesn't support", () => {
    expect(() => toComputerAction({ action: "hold_key", text: "a" })).toThrow(
      "isn't available"
    )
  })
})

describe("anthropicComputerTool", () => {
  it("picks the tool version the model was trained on", () => {
    expect(anthropicComputerTool("claude-opus-5-5", handlers)?.id).toBe(
      "anthropic.computer_toolset_20260801"
    )
    expect(anthropicComputerTool("claude-opus-4-6", handlers)?.id).toBe(
      "anthropic.computer_20251124"
    )
    expect(anthropicComputerTool("claude-sonnet-4-5", handlers)?.id).toBe(
      "anthropic.computer_20250124"
    )
    expect(anthropicComputerTool("claude-haiku-5-5", handlers)).toBeUndefined()
  })
})
