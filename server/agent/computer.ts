import {
  type ModelMessage,
  type ToolResultPart,
  tool,
  type UserModelMessage,
} from "ai"
import { z } from "zod"
import {
  type ComputerAction,
  type ComputerHandlers,
  type ComputerOutput,
  SCREEN,
} from "@/server/ports/computer"
import type { Desktop, Point } from "@/server/ports/sandbox"

export const KEPT_SCREENSHOTS = 3
export const OMITTED = "[Older screenshot left out to save space.]"
const SETTLE_MS = 600
const SCREENSHOT_QUALITY = 70

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export function fitScale(size: { width: number; height: number }) {
  return Math.min(1, SCREEN.width / size.width, SCREEN.height / size.height)
}

export function toScreen(point: Point, scale: number): Point {
  return { x: Math.round(point.x / scale), y: Math.round(point.y / scale) }
}

export function toModel(point: Point, scale: number): Point {
  return { x: Math.round(point.x * scale), y: Math.round(point.y * scale) }
}

export function computerExecutor({
  desktop,
  saveScreenshot,
  waitForControl,
}: {
  desktop: () => Promise<Desktop>
  saveScreenshot: (data: Buffer) => Promise<string>
  waitForControl: () => Promise<string | null>
}) {
  let screen: Promise<{ desktop: Desktop; scale: number }> | undefined

  function open() {
    screen ??= (async () => {
      const opened = await desktop()
      return { desktop: opened, scale: fitScale(await opened.size()) }
    })().catch((error) => {
      screen = undefined
      throw error
    })
    return screen
  }

  async function look(note?: string): Promise<ComputerOutput> {
    const { desktop, scale } = await open()
    const [data, size] = await Promise.all([
      desktop.screenshot({ scale, quality: SCREENSHOT_QUALITY }),
      desktop.size(),
    ])
    const model = toModel({ x: size.width, y: size.height }, scale)
    return {
      screenshot: {
        id: await saveScreenshot(data),
        width: model.x,
        height: model.y,
      },
      ...(note && { note }),
    }
  }

  async function at(point: { x?: number; y?: number }) {
    const { desktop, scale } = await open()
    if (point.x === undefined || point.y === undefined) return desktop.cursor()
    return toScreen({ x: point.x, y: point.y }, scale)
  }

  async function act(action: ComputerAction) {
    const { desktop, scale } = await open()
    switch (action.type) {
      case "screenshot":
        return
      case "click":
        await desktop.click(await at(action), {
          button: action.button,
          clicks: action.clicks,
          modifiers: action.modifiers ?? [],
        })
        break
      case "move":
        await desktop.move(await at(action))
        break
      case "drag":
        await desktop.drag(
          await at({ x: action.fromX, y: action.fromY }),
          await at(action)
        )
        break
      case "scroll":
        await desktop.scroll(await at(action), action.direction, action.amount)
        break
      case "type":
        await desktop.type(action.text)
        break
      case "key":
        for (let press = 0; press < (action.repeat ?? 1); press++) {
          for (const combo of action.keys.trim().split(/\s+/)) {
            await desktop.key(combo)
          }
        }
        break
      case "wait":
        await sleep(action.seconds * 1000)
        return
      case "cursor_position":
        return toModel(await desktop.cursor(), scale)
    }
    await sleep(SETTLE_MS)
  }

  return async (action: ComputerAction): Promise<ComputerOutput> => {
    const note = await waitForControl()
    if (note) return look(note)
    const cursor = await act(action)
    return cursor ? { cursor } : look()
  }
}

function describeComputerOutput(output: ComputerOutput) {
  if (output.cursor) {
    return `The mouse is at x=${output.cursor.x}, y=${output.cursor.y}.`
  }
  const screen = output.screenshot
    ? `This is the screen now (${output.screenshot.width}×${output.screenshot.height}).`
    : "Done."
  return output.note ? `${output.note}\n${screen}` : screen
}

export async function computerModelOutput(
  output: ComputerOutput,
  loadScreenshot: (id: string) => Promise<Buffer | null>
): Promise<ToolResultPart["output"]> {
  const text = describeComputerOutput(output)
  const data = output.screenshot && (await loadScreenshot(output.screenshot.id))
  if (!data) return { type: "text", value: output.screenshot ? OMITTED : text }
  return {
    type: "content",
    value: [
      { type: "text", text },
      {
        type: "file",
        data: { type: "data", data: data.toString("base64") },
        mediaType: "image/jpeg",
      },
    ],
  }
}

const x = z.number().int().min(0).max(SCREEN.width)
const y = z.number().int().min(0).max(SCREEN.height)

const actionSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("screenshot") }),
  z.object({
    type: z.literal("click"),
    x,
    y,
    button: z.enum(["left", "right", "middle"]).default("left"),
    clicks: z
      .number()
      .int()
      .min(1)
      .max(3)
      .default(1)
      .describe("2 for a double click, 3 to select a whole line."),
  }),
  z.object({ type: z.literal("move"), x, y }),
  z.object({ type: z.literal("drag"), fromX: x, fromY: y, x, y }),
  z.object({
    type: z.literal("scroll"),
    x,
    y,
    direction: z.enum(["up", "down", "left", "right"]),
    amount: z.number().int().min(1).max(20).default(3),
  }),
  z.object({ type: z.literal("type"), text: z.string().min(1).max(5000) }),
  z.object({
    type: z.literal("key"),
    keys: z
      .string()
      .trim()
      .min(1)
      .max(100)
      .describe("A key or chord like 'enter', 'ctrl+l' or 'ctrl+shift+t'."),
  }),
  z.object({
    type: z.literal("wait"),
    seconds: z.number().min(0.5).max(30).default(2),
  }),
])

export const computerInputSchema = z.object({
  intent: z
    .string()
    .trim()
    .min(1)
    .max(120)
    .describe(
      "What this does, in plain past-tense words the person sees, like 'Clicked “Export CSV”', 'Typed the email' or 'Looked at the screen'."
    ),
  action: actionSchema,
})

export function computerTool(handlers: ComputerHandlers) {
  return tool({
    description: `See and use your computer's screen (${SCREEN.width}×${SCREEN.height}). Take a screenshot first, then click, type, press keys or scroll. Every action returns a fresh screenshot. Coordinates are pixels in the latest screenshot.`,
    inputSchema: computerInputSchema,
    execute: (input) => handlers.execute(input.action),
    toModelOutput: ({ output }) => handlers.toModelOutput(output),
  })
}

export type HandBack = { after: number; message: ModelMessage }

export function withHandBacks(
  responses: ModelMessage[],
  handBacks: readonly HandBack[]
) {
  const messages: ModelMessage[] = []
  let from = 0
  for (const { after, message } of handBacks) {
    messages.push(...responses.slice(from, after), message)
    from = after
  }
  return [...messages, ...responses.slice(from)]
}

function backwards<T, U>(items: T[], map: (item: T) => U) {
  return items.toReversed().map(map).reverse()
}

export function pruneScreenshots(
  messages: ModelMessage[],
  keep = KEPT_SCREENSHOTS
) {
  let seen = 0
  const omit = (part: { type: string; mediaType?: string }) =>
    part.type === "file" &&
    part.mediaType?.startsWith("image/") === true &&
    ++seen > keep
  const omitted = { type: "text" as const, text: OMITTED }

  return backwards(messages, (message): ModelMessage => {
    if (message.role === "tool") {
      return {
        ...message,
        content: backwards(message.content, (part) =>
          part.type === "tool-result" && part.output.type === "content"
            ? {
                ...part,
                output: {
                  ...part.output,
                  value: backwards(part.output.value, (item) =>
                    omit(item) ? omitted : item
                  ),
                },
              }
            : part
        ),
      }
    }
    if (message.role === "user" && typeof message.content !== "string") {
      const content: UserModelMessage["content"] = backwards(
        message.content,
        (part) => (omit(part) ? omitted : part)
      )
      return { ...message, content }
    }
    return message
  })
}
