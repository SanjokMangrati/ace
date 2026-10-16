import {
  Daytona,
  DaytonaConflictError,
  DaytonaNotFoundError,
  DaytonaProcessExecutionTimeoutError,
  type Sandbox as DaytonaSandbox,
} from "@daytona/sdk"
import type { Desktop, Sandbox, SandboxProvider } from "@/server/ports/sandbox"

const START_TIMEOUT_SEC = 300
const USD_PER_VCPU_HOUR = 0.0504
const USD_PER_GIB_HOUR = 0.0162
const NOVNC_PORT = 6080

async function startDesktop(sandbox: DaytonaSandbox): Promise<Desktop> {
  const { computerUse } = sandbox
  if ((await computerUse.getStatus()).status !== "active") {
    await computerUse.start()
  }
  return {
    size: async () => {
      const { displays = [] } = await computerUse.display.getInfo()
      const display = displays.find((item) => item.isActive) ?? displays[0]
      return { width: display?.width ?? 0, height: display?.height ?? 0 }
    },
    screenshot: async ({ scale, quality }) => {
      const shot = await computerUse.screenshot.takeCompressed({
        format: "jpeg",
        quality,
        scale,
        showCursor: true,
      })
      return Buffer.from(shot.screenshot ?? "", "base64")
    },
    click: async ({ x, y }, { button, clicks, modifiers }) => {
      await computerUse.mouse.click(x, y, button, undefined, clicks, modifiers)
    },
    move: async ({ x, y }) => {
      await computerUse.mouse.move(x, y)
    },
    drag: async (from, to) => {
      await computerUse.mouse.drag(from.x, from.y, to.x, to.y)
    },
    scroll: async ({ x, y }, direction, amount) => {
      await computerUse.mouse.scroll(x, y, direction, amount)
    },
    type: (text) => computerUse.keyboard.type(text),
    key: (combo) => computerUse.keyboard.hotkey(combo),
    cursor: async () => {
      const { x = 0, y = 0 } = await computerUse.mouse.getPosition()
      return { x, y }
    },
    liveView: async (mode, ttlSec) => {
      const { url } = await sandbox.getSignedPreviewUrl(NOVNC_PORT, ttlSec)
      const params = new URLSearchParams({
        autoconnect: "true",
        reconnect: "true",
        resize: "scale",
        quality: "9",
        view_only: String(mode === "view"),
      })
      return `${url}/vnc.html?${params}`
    },
  }
}

function wrap(sandbox: DaytonaSandbox): Sandbox {
  return {
    ref: sandbox.id,
    usdPerHour:
      sandbox.cpu * USD_PER_VCPU_HOUR + sandbox.memory * USD_PER_GIB_HOUR,
    exec: async (command, { cwd, timeoutSec }) => {
      try {
        const response = await sandbox.process.executeCommand(
          command,
          cwd,
          undefined,
          timeoutSec
        )
        return { exitCode: response.exitCode, output: response.result }
      } catch (error) {
        if (error instanceof DaytonaProcessExecutionTimeoutError) {
          throw new Error(
            `The command didn't finish within ${timeoutSec} seconds. Run long jobs in the background and check on them later.`
          )
        }
        throw error
      }
    },
    fs: {
      stat: async (path) => {
        const info = await sandbox.fs.getFileDetails(path)
        return { isDir: info.isDir, size: info.size }
      },
      read: (path) => sandbox.fs.downloadFile(path),
      write: (path, data) => sandbox.fs.uploadFile(data, path),
      list: async (path, depth) => {
        const files = await sandbox.fs.listFiles(path, { depth })
        return files.map((file) => ({
          path: file.path ?? file.name,
          isDir: file.isDir,
          size: file.size,
        }))
      },
    },
    desktop: () => startDesktop(sandbox),
  }
}

export function createDaytonaSandboxes(snapshot: string): SandboxProvider {
  const daytona = new Daytona()

  async function find(idOrName: string) {
    try {
      return await daytona.get(idOrName)
    } catch (error) {
      if (error instanceof DaytonaNotFoundError) return null
      throw error
    }
  }

  async function create(name: string) {
    try {
      return await daytona.create(
        { name, snapshot },
        { timeout: START_TIMEOUT_SEC }
      )
    } catch (error) {
      if (error instanceof DaytonaConflictError) return daytona.get(name)
      throw error
    }
  }

  return {
    name: "daytona",
    open: async (key) => {
      const name = `ace-${key}`
      const sandbox = (await find(name)) ?? (await create(name))
      switch (sandbox.state) {
        case "started":
          break
        case "creating":
        case "starting":
        case "restoring":
          await sandbox.waitUntilStarted(START_TIMEOUT_SEC)
          break
        default:
          await sandbox.start(START_TIMEOUT_SEC)
      }
      return wrap(sandbox)
    },
    destroy: async (ref) => {
      await (await find(ref))?.delete()
    },
  }
}
