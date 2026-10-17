type FileStat = { isDir: boolean; size: number }

export type Point = { x: number; y: number }

export type MouseButton = "left" | "right" | "middle"

export type ScrollDirection = "up" | "down" | "left" | "right"

export interface Desktop {
  size(): Promise<{ width: number; height: number }>
  screenshot(opts: { scale: number; quality: number }): Promise<Buffer>
  click(
    at: Point,
    opts: { button: MouseButton; clicks: number; modifiers: string[] }
  ): Promise<void>
  move(to: Point): Promise<void>
  drag(from: Point, to: Point): Promise<void>
  scroll(at: Point, direction: ScrollDirection, amount: number): Promise<void>
  type(text: string): Promise<void>
  key(combo: string): Promise<void>
  cursor(): Promise<Point>
  open(url: string): Promise<void>
  liveView(ttlSec: number): Promise<string>
}

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
  desktop(): Promise<Desktop>
}

export interface SandboxProvider {
  readonly name: string
  open(key: string): Promise<Sandbox>
  destroy(ref: string): Promise<void>
}
