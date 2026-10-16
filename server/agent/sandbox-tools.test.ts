import { describe, expect, it, vi } from "vitest"
import type { Sandbox } from "@/server/ports/sandbox"
import {
  OUTPUT_LIMIT_CHARS,
  READ_LIMIT_BYTES,
  sandboxTools,
  truncateMiddle,
} from "./sandbox-tools"

const options = { toolCallId: "call-1", messages: [], context: {} }

function fakeSandbox(file: { data: Buffer; isDir?: boolean }) {
  return {
    ref: "sandbox-1",
    usdPerHour: 0.2,
    exec: vi.fn(async () => ({
      exitCode: 0,
      output: "x".repeat(OUTPUT_LIMIT_CHARS * 2),
    })),
    fs: {
      stat: async () => ({
        isDir: file.isDir ?? false,
        size: file.data.length,
      }),
      read: async () => file.data,
      write: vi.fn(async () => {}),
      list: async () => [],
    },
    desktop: () => Promise.reject(new Error("No desktop in this test.")),
  } satisfies Sandbox
}

function toolsFor(sandbox: Sandbox) {
  return sandboxTools(async () => sandbox)
}

describe("truncateMiddle", () => {
  it("keeps short text as is", () => {
    expect(truncateMiddle("hello", 10)).toBe("hello")
  })

  it("keeps the start and the end and says how much was cut", () => {
    expect(truncateMiddle("abcdefghij", 4)).toBe(
      "ab\n[… 6 characters cut …]\nij"
    )
  })
})

describe("shell", () => {
  it("cuts long output to the limit", async () => {
    const sandbox = fakeSandbox({ data: Buffer.from("") })
    const result = await toolsFor(sandbox).shell.execute?.(
      { purpose: "list files", command: "ls", timeoutSeconds: 5 },
      options
    )
    expect(sandbox.exec).toHaveBeenCalledWith("ls", {
      cwd: undefined,
      timeoutSec: 5,
    })
    expect(result).toEqual({
      exitCode: 0,
      output: truncateMiddle(
        "x".repeat(OUTPUT_LIMIT_CHARS * 2),
        OUTPUT_LIMIT_CHARS
      ),
    })
  })
})

describe("fs_read", () => {
  it("returns the text of a small file", async () => {
    const tools = toolsFor(fakeSandbox({ data: Buffer.from("hi") }))
    await expect(
      tools.fs_read.execute?.({ path: "notes.txt" }, options)
    ).resolves.toEqual({ content: "hi" })
  })

  it("refuses files over the limit", async () => {
    const tools = toolsFor(
      fakeSandbox({ data: Buffer.alloc(READ_LIMIT_BYTES + 1, 97) })
    )
    await expect(
      tools.fs_read.execute?.({ path: "big.log" }, options)
    ).rejects.toThrow("over the")
  })

  it("refuses binary files", async () => {
    const tools = toolsFor(fakeSandbox({ data: Buffer.from([1, 0, 2]) }))
    await expect(
      tools.fs_read.execute?.({ path: "photo.png" }, options)
    ).rejects.toThrow("binary")
  })

  it("refuses folders", async () => {
    const tools = toolsFor(fakeSandbox({ data: Buffer.from(""), isDir: true }))
    await expect(
      tools.fs_read.execute?.({ path: "Documents" }, options)
    ).rejects.toThrow("folder")
  })
})

describe("fs_write", () => {
  it("saves the content as UTF-8", async () => {
    const sandbox = fakeSandbox({ data: Buffer.from("") })
    await expect(
      toolsFor(sandbox).fs_write.execute?.(
        { path: "a.md", content: "é" },
        options
      )
    ).resolves.toEqual({ bytes: 2 })
    expect(sandbox.fs.write).toHaveBeenCalledWith("a.md", Buffer.from("é"))
  })
})
