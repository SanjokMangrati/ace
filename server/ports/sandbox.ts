type FileStat = { isDir: boolean; size: number }

export interface Sandbox {
  readonly ref: string
  readonly usdPerHour: number
  exec(
    command: string,
    opts: { cwd?: string; timeoutSec: number }
  ): Promise<{ exitCode: number; output: string }>
  fs: {
    stat(path: string): Promise<FileStat>
    read(path: string): Promise<Buffer>
    write(path: string, data: Buffer): Promise<void>
    list(path: string, depth: number): Promise<(FileStat & { path: string })[]>
  }
}

export interface SandboxProvider {
  readonly name: string
  open(key: string): Promise<Sandbox>
  destroy(ref: string): Promise<void>
}
