import type { ToolResultPart } from "ai"
import type { MouseButton, Point, ScrollDirection } from "./sandbox"

export const SCREEN = { width: 1280, height: 800 }

export type ComputerAction =
  | { type: "screenshot" }
  | {
      type: "click"
      x?: number
      y?: number
      button: MouseButton
      clicks: number
      modifiers?: string[]
    }
  | { type: "move"; x: number; y: number }
  | {
      type: "drag"
      fromX?: number
      fromY?: number
      x: number
      y: number
    }
  | {
      type: "scroll"
      x?: number
      y?: number
      direction: ScrollDirection
      amount: number
    }
  | { type: "type"; text: string }
  | { type: "key"; keys: string; repeat?: number }
  | { type: "wait"; seconds: number }
  | { type: "cursor_position" }

export type ComputerOutput = {
  screenshot?: { id: string; width: number; height: number }
  cursor?: Point
  note?: string
}

export type ComputerHandlers = {
  execute(action: ComputerAction): Promise<ComputerOutput>
  toModelOutput(output: ComputerOutput): Promise<ToolResultPart["output"]>
}

export type NativeComputerInput = {
  action: string
  coordinate?: [number, number]
  start_coordinate?: [number, number]
  text?: string
}
