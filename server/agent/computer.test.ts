import type { ModelMessage } from "ai"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { Desktop } from "@/server/ports/sandbox"
import {
  computerExecutor,
  computerInputSchema,
  computerModelOutput,
  fitScale,
  OMITTED,
  PAGE_SETTLE_MS,
  pruneScreenshots,
  SETTLE_MS,
  toModel,
  toScreen,
  withHandBacks,
} from "./computer"

function fakeDesktop(size = { width: 1280, height: 800 }) {
  return {
    size: async () => size,
    screenshot: vi.fn(async () => Buffer.from("jpeg")),
    click: vi.fn(async () => {}),
    move: vi.fn(async () => {}),
    drag: vi.fn(async () => {}),
    scroll: vi.fn(async () => {}),
    type: vi.fn(async () => {}),
    key: vi.fn(async (_combo: string) => {}),
    cursor: async () => ({ x: 1280, y: 400 }),
    open: vi.fn(async (_url: string) => {}),
    liveView: async () => "wss://screen.example/websockify",
  } satisfies Desktop
}

function executorFor(desktop: Desktop, note: string | null = null) {
  return computerExecutor({
    desktop: async () => desktop,
    saveScreenshot: async () => "shot-1",
    waitForControl: async () => note,
  })
}

async function settled<T>(pending: Promise<T>) {
  await vi.runAllTimersAsync()
  return pending
}

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe("coordinate scaling", () => {
  it("keeps a screen that fits as is", () => {
    expect(fitScale({ width: 1280, height: 800 })).toBe(1)
    expect(fitScale({ width: 1024, height: 768 })).toBe(1)
  })

  it("shrinks a bigger screen to fit and maps points both ways", () => {
    const scale = fitScale({ width: 2560, height: 1600 })
    expect(scale).toBe(0.5)
    expect(toScreen({ x: 100, y: 50 }, scale)).toEqual({ x: 200, y: 100 })
    expect(toModel({ x: 200, y: 100 }, scale)).toEqual({ x: 100, y: 50 })
  })
})

describe("computer executor", () => {
  it("clicks in screen pixels and returns a fresh screenshot", async () => {
    const desktop = fakeDesktop({ width: 2560, height: 1600 })
    const output = await settled(
      executorFor(desktop)([
        { type: "click", x: 100, y: 50, button: "left", clicks: 2 },
      ])
    )
    expect(desktop.click).toHaveBeenCalledWith(
      { x: 200, y: 100 },
      { button: "left", clicks: 2, modifiers: [] }
    )
    expect(desktop.screenshot).toHaveBeenCalledWith({ scale: 0.5, quality: 70 })
    expect(output).toEqual({
      screenshot: { id: "shot-1", width: 1280, height: 800 },
    })
  })

  it("presses each key in a sequence, as many times as asked", async () => {
    const desktop = fakeDesktop()
    await settled(
      executorFor(desktop)([{ type: "key", keys: "Down Return", repeat: 2 }])
    )
    expect(desktop.key.mock.calls.map(([combo]) => combo)).toEqual([
      "Down",
      "Return",
      "Down",
      "Return",
    ])
  })

  it("runs a batch in order, settles once and returns one screenshot", async () => {
    const desktop = fakeDesktop()
    const order: string[] = []
    desktop.click.mockImplementation(async () => {
      order.push("click")
    })
    desktop.type.mockImplementation(async () => {
      order.push("type")
    })
    desktop.key.mockImplementation(async () => {
      order.push("key")
    })
    desktop.screenshot.mockImplementation(async () => {
      order.push("screenshot")
      return Buffer.from("jpeg")
    })
    const pending = executorFor(desktop)([
      { type: "click", x: 1, y: 1, button: "left", clicks: 1 },
      { type: "type", text: "guitars" },
      { type: "key", keys: "enter" },
    ])
    await vi.advanceTimersByTimeAsync(SETTLE_MS - 1)
    expect(order).toEqual(["click", "type", "key"])
    await vi.advanceTimersByTimeAsync(1)
    await pending
    expect(order).toEqual(["click", "type", "key", "screenshot"])
    expect(desktop.screenshot).toHaveBeenCalledTimes(1)
  })

  it("opens a page and gives it longer to load", async () => {
    const desktop = fakeDesktop()
    const pending = executorFor(desktop)([
      { type: "open_url", url: "https://example.com/?q=guitars" },
    ])
    await vi.advanceTimersByTimeAsync(SETTLE_MS)
    expect(desktop.open).toHaveBeenCalledWith("https://example.com/?q=guitars")
    expect(desktop.screenshot).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(PAGE_SETTLE_MS - SETTLE_MS)
    await pending
    expect(desktop.screenshot).toHaveBeenCalledTimes(1)
  })

  it("reports the cursor without a screenshot", async () => {
    const desktop = fakeDesktop({ width: 2560, height: 1600 })
    await expect(
      settled(executorFor(desktop)([{ type: "cursor_position" }]))
    ).resolves.toEqual({ cursor: { x: 640, y: 200 } })
    expect(desktop.screenshot).not.toHaveBeenCalled()
  })

  it("skips the actions after you had control and shows the screen", async () => {
    const desktop = fakeDesktop()
    const output = await settled(
      executorFor(
        desktop,
        "You had control."
      )([{ type: "type", text: "hello" }])
    )
    expect(desktop.type).not.toHaveBeenCalled()
    expect(output).toMatchObject({
      note: "You had control.",
      screenshot: { id: "shot-1" },
    })
  })
})

describe("computer input", () => {
  it("fills in defaults for a click", () => {
    expect(
      computerInputSchema.parse({
        intent: "Clicked “Export CSV”",
        action: { type: "click", x: 10, y: 20 },
      }).action
    ).toEqual({ type: "click", x: 10, y: 20, button: "left", clicks: 1 })
  })

  it("takes more actions to run right after", () => {
    const input = computerInputSchema.parse({
      intent: "Searched for guitars",
      action: { type: "click", x: 10, y: 20 },
      andThen: [
        { type: "type", text: "guitars" },
        { type: "key", keys: "enter" },
      ],
    })
    expect(input.andThen?.map((action) => action.type)).toEqual(["type", "key"])
  })

  it("refuses points off the screen and non-web URLs", () => {
    expect(
      computerInputSchema.safeParse({
        intent: "Clicked",
        action: { type: "click", x: 5000, y: 20 },
      }).success
    ).toBe(false)
    expect(
      computerInputSchema.safeParse({
        intent: "Opened a file",
        action: { type: "open_url", url: "file:///etc/passwd" },
      }).success
    ).toBe(false)
  })
})

describe("computerModelOutput", () => {
  it("sends the screenshot as an image", async () => {
    const output = await computerModelOutput(
      { screenshot: { id: "shot-1", width: 1280, height: 800 } },
      async () => Buffer.from("jpeg")
    )
    expect(output).toEqual({
      type: "content",
      value: [
        { type: "text", text: "This is the screen now (1280×800)." },
        {
          type: "file",
          data: { type: "data", data: Buffer.from("jpeg").toString("base64") },
          mediaType: "image/jpeg",
        },
      ],
    })
  })

  it("says the screenshot was left out when it is gone", async () => {
    await expect(
      computerModelOutput(
        { screenshot: { id: "gone", width: 1280, height: 800 } },
        async () => null
      )
    ).resolves.toEqual({ type: "text", value: OMITTED })
  })
})

describe("withHandBacks", () => {
  const say = (text: string): ModelMessage => ({ role: "user", content: text })

  it("puts each hand-back after the steps that came before it", () => {
    expect(
      withHandBacks(
        [say("a"), say("b"), say("c")],
        [
          { after: 1, message: say("back 1") },
          { after: 3, message: say("back 2") },
        ]
      )
    ).toEqual([say("a"), say("back 1"), say("b"), say("c"), say("back 2")])
  })
})

describe("pruneScreenshots", () => {
  const image = {
    type: "file" as const,
    data: { type: "data" as const, data: "jpeg" },
    mediaType: "image/jpeg",
  }
  const result = (id: string): ModelMessage => ({
    role: "tool",
    content: [
      {
        type: "tool-result",
        toolCallId: id,
        toolName: "computer",
        output: { type: "content", value: [image] },
      },
    ],
  })
  const images = (messages: ModelMessage[]) =>
    messages.map((message) =>
      JSON.stringify(message).includes("image/jpeg") ? "image" : "omitted"
    )

  it("keeps only the newest screenshots", () => {
    const messages: ModelMessage[] = [
      result("a"),
      { role: "user", content: [{ type: "text", text: "back to you" }, image] },
      result("b"),
      result("c"),
    ]
    expect(images(pruneScreenshots(messages, 2))).toEqual([
      "omitted",
      "omitted",
      "image",
      "image",
    ])
  })

  it("leaves text-only messages alone", () => {
    const messages: ModelMessage[] = [{ role: "user", content: "hi" }]
    expect(pruneScreenshots(messages)).toEqual(messages)
  })
})
