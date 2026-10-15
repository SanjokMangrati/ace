import { tool } from "ai"
import { z } from "zod"
import type { Sandbox } from "@/server/ports/sandbox"

export const OUTPUT_LIMIT_CHARS = 16_000
export const READ_LIMIT_BYTES = 100_000
const WRITE_LIMIT_CHARS = 1_000_000
const LIST_LIMIT = 500

const path = z.string().trim().min(1).max(1000)

export function truncateMiddle(text: string, limit: number) {
  if (text.length <= limit) return text
  const half = Math.floor(limit / 2)
  return `${text.slice(0, half)}\n[… ${text.length - 2 * half} characters cut …]\n${text.slice(-half)}`
}

export function sandboxTools(open: () => Promise<Sandbox>) {
  return {
    shell: tool({
      description:
        "Run a bash command on your computer. A command stops after timeoutSeconds, so start servers and desktop apps in the background, like `nohup chromium >/dev/null 2>&1 &`. Long output is cut in the middle.",
      inputSchema: z.object({
        purpose: z
          .string()
          .trim()
          .min(1)
          .max(120)
          .describe(
            "What the command is for, in plain words that finish the sentence 'Ran a command to …', like 'compare the totals'. The person sees this."
          ),
        command: z.string().min(1).max(10_000),
        cwd: path
          .optional()
          .describe("Folder to run in. Defaults to your home folder."),
        timeoutSeconds: z.number().int().min(1).max(600).default(120),
      }),
      execute: async ({ command, cwd, timeoutSeconds }) => {
        const sandbox = await open()
        const result = await sandbox.exec(command, {
          cwd,
          timeoutSec: timeoutSeconds,
        })
        return {
          exitCode: result.exitCode,
          output: truncateMiddle(result.output, OUTPUT_LIMIT_CHARS),
        }
      },
    }),
    fs_read: tool({
      description: `Read a text file on your computer, up to ${READ_LIMIT_BYTES / 1000} KB. For bigger or binary files, use shell with head, tail or grep.`,
      inputSchema: z.object({ path }),
      execute: async (input) => {
        const sandbox = await open()
        const stat = await sandbox.fs.stat(input.path)
        if (stat.isDir) {
          throw new Error(
            `${input.path} is a folder. Use fs_list to see what's inside.`
          )
        }
        if (stat.size > READ_LIMIT_BYTES) {
          throw new Error(
            `${input.path} is ${stat.size} bytes, over the ${READ_LIMIT_BYTES} byte limit. Use shell with head, tail or grep to read part of it.`
          )
        }
        const data = await sandbox.fs.read(input.path)
        if (data.includes(0)) {
          throw new Error(
            `${input.path} is a binary file. Use shell to look inside it.`
          )
        }
        return { content: data.toString("utf8") }
      },
    }),
    fs_write: tool({
      description:
        "Save a text file on your computer, replacing it if it exists. Missing folders are created.",
      inputSchema: z.object({
        path,
        content: z.string().max(WRITE_LIMIT_CHARS),
      }),
      execute: async (input) => {
        const sandbox = await open()
        const data = Buffer.from(input.content, "utf8")
        await sandbox.fs.write(input.path, data)
        return { bytes: data.length }
      },
    }),
    fs_list: tool({
      description: `List what's in a folder on your computer, up to ${LIST_LIMIT} entries.`,
      inputSchema: z.object({
        path: path.default("."),
        depth: z
          .number()
          .int()
          .min(1)
          .max(3)
          .default(1)
          .describe("1 lists the folder itself, 2 also lists its subfolders."),
      }),
      execute: async (input) => {
        const sandbox = await open()
        const entries = await sandbox.fs.list(input.path, input.depth)
        return {
          entries: entries.slice(0, LIST_LIMIT),
          truncated: entries.length > LIST_LIMIT,
        }
      },
    }),
  }
}

export type SandboxTools = ReturnType<typeof sandboxTools>
