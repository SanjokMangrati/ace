import { afterAll, describe, expect, it } from "vitest"
import type { Sandbox, SandboxProvider } from "@/server/ports/sandbox"

export function sandboxContract(
  name: string,
  make: () => { sandboxes: SandboxProvider; key: string; root: string },
  timeout = 5_000
) {
  describe(`${name} SandboxProvider contract`, { timeout }, () => {
    let made: ReturnType<typeof make> | undefined
    let opened: Promise<Sandbox> | undefined
    const setup = () => {
      made ??= make()
      return made
    }
    const open = () => {
      const { sandboxes, key } = setup()
      opened ??= sandboxes.open(key)
      return opened
    }

    afterAll(async () => {
      if (made && opened) await made.sandboxes.destroy((await opened).ref)
    }, timeout)

    it("gives back the same sandbox for the same key", async () => {
      const sandbox = await open()
      const { sandboxes, key } = setup()
      expect((await sandboxes.open(key)).ref).toBe(sandbox.ref)
      expect(sandbox.usdPerHour).toBeGreaterThanOrEqual(0)
    })

    it("runs a command", async () => {
      const sandbox = await open()
      expect(await sandbox.exec("true", { timeoutSec: 30 })).toMatchObject({
        exitCode: 0,
      })
    })

    it("writes, reads, stats and lists files", async () => {
      const { fs } = await open()
      const { root } = setup()
      const data = Buffer.from("hello")
      await fs.write(`${root}/a.txt`, data)
      expect(await fs.read(`${root}/a.txt`)).toEqual(data)
      expect(await fs.stat(`${root}/a.txt`)).toEqual({ isDir: false, size: 5 })
      const listed = await fs.list(root, 1)
      expect(listed.some((file) => file.path.endsWith("a.txt"))).toBe(true)
      await expect(fs.stat(`${root}/missing.txt`)).rejects.toThrow()
    })

    it("shows a desktop that takes JPEG screenshots and follows the mouse", async () => {
      const desktop = await (await open()).desktop()
      const { width, height } = await desktop.size()
      expect(width).toBeGreaterThan(0)
      expect(height).toBeGreaterThan(0)
      const shot = await desktop.screenshot({ scale: 0.5, quality: 60 })
      expect([...shot.subarray(0, 2)]).toEqual([0xff, 0xd8])
      await desktop.move({ x: 40, y: 30 })
      expect(await desktop.cursor()).toEqual({ x: 40, y: 30 })
      expect(await desktop.liveView(60)).toMatch(/^wss?:\/\//)
    })
  })
}
