import { tool } from "ai"
import { z } from "zod"
import type { Sandbox } from "@/server/ports/sandbox"
import { shellQuote } from "@/server/sandbox/shell"
import { truncateMiddle } from "./sandbox-tools"

export const PAGE_LIMIT_CHARS = 24_000
const RESULT_LIMIT = 8
const SEARCH_TIMEOUT_SEC = 30
const FETCH_TIMEOUT_SEC = 60
const ERROR_TAIL_CHARS = 300

const resultsSchema = z.object({
  results: z
    .array(
      z.object({ title: z.string(), url: z.string(), snippet: z.string() })
    )
    .max(RESULT_LIMIT),
})

const pageSchema = z.object({
  title: z.string().nullable(),
  url: z.string(),
  text: z.string(),
})

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text)
  } catch {
    return undefined
  }
}

export function parseWebOutput<S extends z.ZodType>(
  schema: S,
  result: { exitCode: number; output: string },
  failure: string
): z.output<S> {
  if (result.exitCode === 0) {
    const parsed = schema.safeParse(parseJson(result.output))
    if (parsed.success) return parsed.data
  }
  const reason = result.output.trim().slice(-ERROR_TAIL_CHARS)
  throw new Error(reason ? `${failure} ${reason}` : failure)
}

export function webTools(open: () => Promise<Sandbox>) {
  return {
    web_search: tool({
      description:
        "Search the web from your computer. Returns the top results with a title, link and snippet. Use it for anything public, then read a result with web_fetch.",
      inputSchema: z.object({
        query: z
          .string()
          .trim()
          .min(1)
          .max(400)
          .describe("What to search for, like a search box."),
      }),
      execute: async ({ query }) => {
        const sandbox = await open()
        const result = await sandbox.exec(
          `ace-web search ${shellQuote(query)}`,
          {
            timeoutSec: SEARCH_TIMEOUT_SEC,
          }
        )
        return parseWebOutput(
          resultsSchema,
          result,
          "The search didn't go through. Try different words, or open the search on your screen."
        )
      },
    }),
    web_fetch: tool({
      description:
        "Read a web page from your computer as plain text, like a reader view. Works for public pages. For a page that needs you signed in or blocks automated reading, use your screen instead.",
      inputSchema: z.object({
        url: z.url({ protocol: /^https?$/ }).max(2000),
      }),
      execute: async ({ url }) => {
        const sandbox = await open()
        const result = await sandbox.exec(`ace-web fetch ${shellQuote(url)}`, {
          timeoutSec: FETCH_TIMEOUT_SEC,
        })
        const page = parseWebOutput(
          pageSchema,
          result,
          "Couldn't read that page as text. Open it on your screen instead."
        )
        return { ...page, text: truncateMiddle(page.text, PAGE_LIMIT_CHARS) }
      },
    }),
  }
}

export type WebTools = ReturnType<typeof webTools>
