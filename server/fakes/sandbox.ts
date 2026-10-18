import type {
  Desktop,
  Point,
  Sandbox,
  SandboxProvider,
} from "@/server/ports/sandbox"

type ExecResult = { exitCode: number; output: string }

const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xd9])

type FakeSandbox = Sandbox & { commands: string[] }

function fakeDesktop(): Desktop {
  let cursor: Point = { x: 0, y: 0 }
  return {
    size: async () => ({ width: 1280, height: 800 }),
    screenshot: async () => JPEG,
    click: async (at) => {
      cursor = at
    },
    move: async (to) => {
      cursor = to
    },
    drag: async (_from, to) => {
      cursor = to
    },
    scroll: async (at) => {
      cursor = at
    },
    type: async () => {},
    key: async () => {},
    cursor: async () => cursor,
    open: async () => {},
    liveView: async (ttlSec) => `wss://sandbox.test/live?ttl=${ttlSec}`,
  }
}

function fakeSandbox(
  ref: string,
  exec: (command: string) => ExecResult
): FakeSandbox {
  const commands: string[] = []
  const files = new Map<string, Buffer>()
  const missing = (path: string) => new Error(`No such file: ${path}`)
  return {
    ref,
    usdPerHour: 0.1,
    commands,
    exec: async (command) => {
      commands.push(command)
      return exec(command)
    },
    fs: {
      stat: async (path) => {
        const data = files.get(path)
        if (data) return { isDir: false, size: data.length }
        const prefix = `${path.replace(/\/$/, "")}/`
        if ([...files.keys()].some((key) => key.startsWith(prefix))) {
          return { isDir: true, size: 0 }
        }
        throw missing(path)
      },
      read: async (path) => {
        const data = files.get(path)
        if (!data) throw missing(path)
        return Buffer.from(data)
      },
      write: async (path, data) => {
        files.set(path, Buffer.from(data))
      },
      list: async (path, depth) => {
        const prefix = `${path.replace(/\/$/, "")}/`
        return [...files.entries()]
          .filter(
            ([key]) =>
              key.startsWith(prefix) &&
              key.slice(prefix.length).split("/").length <= depth
          )
          .map(([key, data]) => ({
            path: key,
            isDir: false,
            size: data.length,
          }))
      },
    },
    desktop: async () => fakeDesktop(),
  }
}

export function createFakeSandboxes(
  exec: (command: string) => ExecResult = () => ({ exitCode: 0, output: "" })
): SandboxProvider & { opened: Map<string, FakeSandbox> } {
  const opened = new Map<string, FakeSandbox>()
  return {
    name: "fake",
    opened,
    open: async (key) => {
      const existing = opened.get(key)
      if (existing) return existing
      const sandbox = fakeSandbox(`fake-${key}`, exec)
      opened.set(key, sandbox)
      return sandbox
    },
    destroy: async (ref) => {
      for (const [key, sandbox] of opened) {
        if (sandbox.ref === ref) opened.delete(key)
      }
    },
  }
}
