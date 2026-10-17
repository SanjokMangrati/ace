import { describe, expect, it, vi } from "vitest"
import { z } from "zod"
import type { Sandbox } from "@/server/ports/sandbox"
import { shellQuote } from "@/server/sandbox/shell"
import { PAGE_LIMIT_CHARS, parseWebOutput, webTools } from "./web-tools"

const options = { toolCallId: "call-1", messages: [], context: {} }

function fakeSandbox(result: { exitCode: number; output: string }) {
  return {
    ref: "sandbox-1",
    usdPerHour: 0.2,
    exec: vi.fn(async () => result),
    fs: {
      stat: async () => ({ isDir: false, size: 0 }),
      read: async () => Buffer.alloc(0),
      write: async () => {},
      list: async () => [],
    },
    desktop: () => Promise.reject(new Error("No desktop in this test.")),
  } satisfies Sandbox
}

describe("shellQuote", () => {
  it("wraps text so the shell takes it as one word", () => {
    expect(shellQuote("best guitar's price $2,199")).toBe(
      "'best guitar'\\''s price $2,199'"
    )
  })
})

describe("parseWebOutput", () => {
  const schema = z.object({ ok: z.boolean() })

  it("returns the parsed JSON of a clean run", () => {
    expect(
      parseWebOutput(schema, { exitCode: 0, output: '{"ok":true}' }, "Failed.")
    ).toEqual({ ok: true })
  })

  it("turns a failed run into a tool error with the script's reason", () => {
    expect(() =>
      parseWebOutput(
        schema,
        { exitCode: 1, output: "This site blocks automated reading." },
        "Couldn't read that page."
      )
    ).toThrow("Couldn't read that page. This site blocks automated reading.")
  })
})

describe("webTools", () => {
  it("searches from the sandbox and returns the results", async () => {
    const results = [
      { title: "Fender", url: "https://fender.com", snippet: "Guitars" },
    ]
    const sandbox = fakeSandbox({
      exitCode: 0,
      output: JSON.stringify({ results }),
    })
    const tools = webTools(async () => sandbox)
    await expect(
      tools.web_search.execute?.({ query: "fender strat price" }, options)
    ).resolves.toEqual({ results })
    expect(sandbox.exec).toHaveBeenCalledWith(
      "ace-web search 'fender strat price'",
      { timeoutSec: 30 }
    )
  })

  it("reads a page and cuts long text in the middle", async () => {
    const sandbox = fakeSandbox({
      exitCode: 0,
      output: JSON.stringify({
        title: "Strat",
        url: "https://fender.com/strat",
        text: "x".repeat(PAGE_LIMIT_CHARS * 2),
      }),
    })
    const tools = webTools(async () => sandbox)
    const page = await tools.web_fetch.execute?.(
      { url: "https://fender.com/strat" },
      options
    )
    expect(page).toMatchObject({
      title: "Strat",
      url: "https://fender.com/strat",
      text: expect.stringContaining("characters cut"),
    })
  })
})
