import { Writable } from "node:stream"
import { describe, expect, it } from "vitest"
import { loggerContract } from "@/server/contracts/logger"
import { createPinoLogger } from "."

function capture() {
  const lines: Record<string, unknown>[] = []
  const stream = new Writable({
    write(chunk, _encoding, done) {
      lines.push(JSON.parse(chunk.toString()))
      done()
    },
  })
  return { logger: createPinoLogger(stream), lines: () => lines }
}

loggerContract("Pino", capture)

describe("createPinoLogger", () => {
  it("redacts key-like fields at the top level and one level down", () => {
    const { logger, lines } = capture()
    logger.warn("Provider check failed", {
      apiKey: "sk-ant-secret",
      credentials: { apiKey: "sk-ant-secret", provider: "anthropic" },
      headers: { authorization: "Bearer secret" },
    })
    const [line] = lines()
    expect(JSON.stringify(line)).not.toContain("secret")
    expect(line).toMatchObject({
      apiKey: "[redacted]",
      credentials: { apiKey: "[redacted]", provider: "anthropic" },
    })
  })

  it("logs only the name, message, stack and codes of an error", () => {
    const { logger, lines } = capture()
    const error = Object.assign(new Error("Bad request"), {
      statusCode: 400,
      requestBodyValues: { messages: ["private prompt"] },
      responseBody: "private reply",
      responseHeaders: { "x-api-key": "sk-secret" },
    })
    logger.error("Model call failed", { err: error })
    const [line] = lines()
    expect(JSON.stringify(line)).not.toMatch(/private|sk-secret/)
    expect(line).toMatchObject({
      err: { type: "Error", message: "Bad request", statusCode: 400 },
    })
  })
})
