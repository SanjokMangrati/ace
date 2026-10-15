import { Daytona, DaytonaNotFoundError, Image } from "@daytona/sdk"

const name = process.env.DAYTONA_SNAPSHOT || "ace-desktop"
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
      resources: { cpu: 2, memory: 4, disk: 10 },
    },
    { onLogs: print }
  )
  print(`Snapshot "${name}" is ready.`)
}
