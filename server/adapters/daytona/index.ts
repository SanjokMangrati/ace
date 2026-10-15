import {
  Daytona,
  DaytonaConflictError,
  DaytonaNotFoundError,
  DaytonaProcessExecutionTimeoutError,
  type Sandbox as DaytonaSandbox,
} from "@daytona/sdk"
import type { Sandbox, SandboxProvider } from "@/server/ports/sandbox"

const START_TIMEOUT_SEC = 300
const USD_PER_VCPU_HOUR = 0.0504
const USD_PER_GIB_HOUR = 0.0162

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
