import { Daytona, DaytonaNotFoundError, Image } from "@daytona/sdk"

const name = process.env.DAYTONA_SNAPSHOT || "ace-desktop"
const resources = {
  cpu: Number(process.env.SANDBOX_CPU || 2),
  memory: Number(process.env.SANDBOX_MEMORY_GIB || 4),
  disk: Number(process.env.SANDBOX_DISK_GIB || 10),
}
const daytona = new Daytona()

function print(line: string) {
  process.stdout.write(`${line}\n`)
}

async function exists() {
  try {
    await daytona.snapshot.get(name)
    return true
  } catch (error) {
    if (error instanceof DaytonaNotFoundError) return false
    throw error
  }
}

if (await exists()) {
  print(
    `Snapshot "${name}" already exists. Delete it in the Daytona dashboard to rebuild it.`
  )
} else {
  await daytona.snapshot.create(
    {
      name,
      image: Image.fromDockerfile("sandbox/image/Dockerfile"),
      resources,
    },
    { onLogs: print }
  )
  print(`Snapshot "${name}" is ready.`)
}
