import { describe, expect, it, vi } from "vitest"
import { z } from "zod"
import { createFakeSandboxes } from "@/server/fakes/sandbox"
import { shellQuote } from "@/server/sandbox/shell"
import { PAGE_LIMIT_CHARS, parseWebOutput, webTools } from "./web-tools"

const options = { toolCallId: "call-1", messages: [], context: {} }

async function openSandbox(output: unknown) {
  const sandbox = await createFakeSandboxes(() => ({
    exitCode: 0,
    output: JSON.stringify(output),
  })).open("bot")
  return {
    exec: vi.spyOn(sandbox, "exec"),
    tools: webTools(async () => sandbox),
  }
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
    const { exec, tools } = await openSandbox({ results })
    await expect(
      tools.web_search.execute?.({ query: "fender strat price" }, options)
    ).resolves.toEqual({ results })
    expect(exec).toHaveBeenCalledWith("ace-web search 'fender strat price'", {
      timeoutSec: 30,
    })
  })

  it("reads a page and cuts long text in the middle", async () => {
    const { tools } = await openSandbox({
      title: "Strat",
      url: "https://fender.com/strat",
      text: "x".repeat(PAGE_LIMIT_CHARS * 2),
    })
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
