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
const MAX_BATCH = 10
export const SETTLE_MS = 2000
export const PAGE_SETTLE_MS = 4000
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

function settleFor(action: ComputerAction) {
  switch (action.type) {
    case "screenshot":
    case "cursor_position":
    case "wait":
      return 0
    case "open_url":
      return PAGE_SETTLE_MS
    default:
      return SETTLE_MS
  }
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
        return
      case "move":
        await desktop.move(await at(action))
        return
      case "drag":
        await desktop.drag(
          await at({ x: action.fromX, y: action.fromY }),
          await at(action)
        )
        return
      case "scroll":
        await desktop.scroll(await at(action), action.direction, action.amount)
        return
      case "type":
        await desktop.type(action.text)
        return
      case "key":
        for (let press = 0; press < (action.repeat ?? 1); press++) {
          for (const combo of action.keys.trim().split(/\s+/)) {
            await desktop.key(combo)
          }
        }
        return
      case "wait":
        await sleep(action.seconds * 1000)
        return
      case "open_url":
        await desktop.open(action.url)
        return
      case "cursor_position":
        return toModel(await desktop.cursor(), scale)
    }
  }

  return async (actions: ComputerAction[]): Promise<ComputerOutput> => {
    const note = await waitForControl()
    if (note) return look(note)
    let cursor: Point | undefined
    let settle = 0
    for (const action of actions) {
      cursor = await act(action)
      settle = Math.max(settle, settleFor(action))
    }
    if (cursor && actions.length === 1) return { cursor }
    if (settle > 0) await sleep(settle)
    return look()
  }
}

function describeComputerOutput(output: ComputerOutput) {
  if ("cursor" in output) {
    return `The mouse is at x=${output.cursor.x}, y=${output.cursor.y}.`
  }
  const screen = `This is the screen now (${output.screenshot.width}×${output.screenshot.height}).`
  return output.note ? `${output.note}\n${screen}` : screen
}

export async function computerModelOutput(
  output: ComputerOutput,
  loadScreenshot: (id: string) => Promise<Buffer | null>
): Promise<ToolResultPart["output"]> {
  const text = describeComputerOutput(output)
  if ("cursor" in output) return { type: "text", value: text }
  const data = await loadScreenshot(output.screenshot.id)
  if (!data) return { type: "text", value: OMITTED }
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
    type: z.literal("open_url"),
    url: z
      .url({ protocol: /^https?$/ })
      .max(2000)
      .describe(
        "Opens the page in the browser, starting the browser when it isn't open. Put the search or filter in the URL when you can."
      ),
  }),
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
    seconds: z
      .number()
      .min(0.5)
      .max(30)
      .default(2)
      .describe(
        "Only for a page that is still loading in the screenshot. Every call already waits for the screen to settle."
      ),
  }),
])

export const computerInputSchema = z.object({
  intent: z
    .string()
    .trim()
    .min(1)
    .max(120)
    .describe(
      "What this does, in plain past-tense words the person sees, like 'Opened the Fender product page', 'Clicked “Export CSV”' or 'Typed the email'."
    ),
  action: actionSchema,
  andThen: z
    .array(actionSchema)
    .max(MAX_BATCH - 1)
    .optional()
    .describe(
      "More actions to run right after, in order, when you already know them without seeing the screen in between: typing into a field you just clicked, pressing enter, scrolling a few times. One call with several actions is much faster than one call each."
    ),
})

export function computerTool(handlers: ComputerHandlers) {
  return tool({
    description: `See and use your computer's screen (${SCREEN.width}×${SCREEN.height}). open_url goes straight to a page. Click, type, press keys and scroll like a person would; coordinates are pixels in the latest screenshot. Every call waits for the screen to settle and returns one fresh screenshot of the final screen.`,
    inputSchema: computerInputSchema,
    execute: (input) =>
      handlers.execute([input.action, ...(input.andThen ?? [])]),
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
