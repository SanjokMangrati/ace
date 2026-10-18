import { describe, expect, it, vi } from "vitest"
import { createFakeSandboxes } from "@/server/fakes/sandbox"
import {
  OUTPUT_LIMIT_CHARS,
  READ_LIMIT_BYTES,
  sandboxTools,
  truncateMiddle,
} from "./sandbox-tools"

const options = { toolCallId: "call-1", messages: [], context: {} }

const LONG_OUTPUT = "x".repeat(OUTPUT_LIMIT_CHARS * 2)

async function openSandbox(files: Record<string, Buffer> = {}) {
  const sandbox = await createFakeSandboxes(() => ({
    exitCode: 0,
    output: LONG_OUTPUT,
  })).open("bot")
  for (const [path, data] of Object.entries(files)) {
    await sandbox.fs.write(path, data)
  }
  return { sandbox, tools: sandboxTools(async () => sandbox) }
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
    const { sandbox, tools } = await openSandbox()
    const exec = vi.spyOn(sandbox, "exec")
    const result = await tools.shell.execute?.(
      { purpose: "list files", command: "ls", timeoutSeconds: 5 },
      options
    )
    expect(exec).toHaveBeenCalledWith("ls", { cwd: undefined, timeoutSec: 5 })
    expect(result).toEqual({
      exitCode: 0,
      output: truncateMiddle(LONG_OUTPUT, OUTPUT_LIMIT_CHARS),
    })
  })
})

describe("fs_read", () => {
  it("returns the text of a small file", async () => {
    const { tools } = await openSandbox({ "notes.txt": Buffer.from("hi") })
    await expect(
      tools.fs_read.execute?.({ path: "notes.txt" }, options)
    ).resolves.toEqual({ content: "hi" })
  })

  it("refuses files over the limit", async () => {
    const { tools } = await openSandbox({
      "big.log": Buffer.alloc(READ_LIMIT_BYTES + 1, 97),
    })
    await expect(
      tools.fs_read.execute?.({ path: "big.log" }, options)
    ).rejects.toThrow("over the")
  })

  it("refuses binary files", async () => {
    const { tools } = await openSandbox({ "photo.png": Buffer.from([1, 0, 2]) })
    await expect(
      tools.fs_read.execute?.({ path: "photo.png" }, options)
    ).rejects.toThrow("binary")
  })

  it("refuses folders", async () => {
    const { tools } = await openSandbox({
      "Documents/a.txt": Buffer.from("a"),
    })
    await expect(
      tools.fs_read.execute?.({ path: "Documents" }, options)
    ).rejects.toThrow("folder")
  })
})

describe("fs_write", () => {
  it("saves the content as UTF-8", async () => {
    const { sandbox, tools } = await openSandbox()
    await expect(
      tools.fs_write.execute?.({ path: "a.md", content: "é" }, options)
    ).resolves.toEqual({ bytes: 2 })
    await expect(sandbox.fs.read("a.md")).resolves.toEqual(Buffer.from("é"))
  })
})
