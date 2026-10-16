import { anthropic } from "@ai-sdk/anthropic"
import {
  type ComputerAction,
  type ComputerHandlers,
  type NativeComputerInput,
  SCREEN,
} from "@/server/ports/computer"
import type { MouseButton, ScrollDirection } from "@/server/ports/sandbox"

type AnthropicInput = NativeComputerInput & {
  repeat?: number
  duration?: number
  scroll_direction?: ScrollDirection
  scroll_amount?: number
}

const TOOLSET = /^claude-((opus|sonnet|fable)-5|opus-4-8)/
const ZOOM_TOOL = /^claude-opus-4-[5-7]/
const LEGACY_TOOL =
  /^claude-(sonnet-4-5|haiku-4-5|opus-4-1|(opus|sonnet)-4-(0|2025))/

const clicks: Record<string, { button: MouseButton; clicks: number }> = {
  left_click: { button: "left", clicks: 1 },
  right_click: { button: "right", clicks: 1 },
  middle_click: { button: "middle", clicks: 1 },
  double_click: { button: "left", clicks: 2 },
  triple_click: { button: "left", clicks: 3 },
}

function point(coordinate: [number, number] | undefined) {
  return coordinate && { x: coordinate[0], y: coordinate[1] }
}

export function toComputerAction(input: AnthropicInput): ComputerAction {
  const at = point(input.coordinate)
  const click = clicks[input.action]
  if (click) {
    return {
      type: "click",
      ...at,
      ...click,
      modifiers: input.text?.split("+").filter(Boolean),
    }
  }
  switch (input.action) {
    case "screenshot":
      return { type: "screenshot" }
    case "cursor_position":
      return { type: "cursor_position" }
    case "mouse_move":
      if (at) return { type: "move", ...at }
      break
    case "left_click_drag":
      if (at) {
        const from = point(input.start_coordinate)
        return { type: "drag", fromX: from?.x, fromY: from?.y, ...at }
      }
      break
    case "scroll":
      return {
        type: "scroll",
        ...at,
        direction: input.scroll_direction ?? "down",
        amount: input.scroll_amount ?? 3,
      }
    case "type":
      if (input.text) return { type: "type", text: input.text }
      break
    case "key":
      if (input.text) {
        return { type: "key", keys: input.text, repeat: input.repeat }
      }
      break
    case "wait":
      return { type: "wait", seconds: input.duration ?? 1 }
  }
  throw new Error(
    `The ${input.action} action isn't available here, or it is missing its coordinate or text. Use click, move, drag, scroll, type, key, wait or screenshot.`
  )
}

export function anthropicComputerTool(
  modelId: string,
  { execute, toModelOutput }: ComputerHandlers
) {
  const handlers = {
    execute: (input: AnthropicInput) => execute(toComputerAction(input)),
    toModelOutput: ({
      output,
    }: {
      output: Awaited<ReturnType<ComputerHandlers["execute"]>>
    }) => toModelOutput(output),
  }
  const display = {
    displayWidthPx: SCREEN.width,
    displayHeightPx: SCREEN.height,
  }
  if (TOOLSET.test(modelId)) {
    return anthropic.tools.computerToolset_20260801({
      configs: {
        zoom: { enabled: false },
        hold_key: { enabled: false },
        left_mouse_down: { enabled: false },
        left_mouse_up: { enabled: false },
      },
      ...handlers,
    })
  }
  if (ZOOM_TOOL.test(modelId)) {
    return anthropic.tools.computer_20251124({ ...display, ...handlers })
  }
  if (LEGACY_TOOL.test(modelId)) {
    return anthropic.tools.computer_20250124({ ...display, ...handlers })
  }
  return undefined
}
