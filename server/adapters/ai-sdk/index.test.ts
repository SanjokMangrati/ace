import { afterEach, describe, expect, it, vi } from "vitest"
import { createAiSdkModels } from "."

const models = createAiSdkModels()

function answer(status: number) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response(null, { status }))
  )
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("rejectsKey", () => {
  it("rejects a key the provider turns down", async () => {
    answer(401)
    await expect(
      models.rejectsKey({ provider: "openai", apiKey: "sk-x", baseUrl: null })
    ).resolves.toBe(true)
  })

  it("rejects a key Google calls invalid", async () => {
    answer(400)
    await expect(
      models.rejectsKey({ provider: "google", apiKey: "AIza", baseUrl: null })
    ).resolves.toBe(true)
  })

  it("accepts a key the provider takes", async () => {
    answer(200)
    await expect(
      models.rejectsKey({
        provider: "anthropic",
        apiKey: "sk-ant",
        baseUrl: null,
      })
    ).resolves.toBe(false)
  })

  it("accepts the key when the provider can't be reached", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new TypeError("fetch failed")
      })
    )
    await expect(
      models.rejectsKey({ provider: "openai", apiKey: "sk-x", baseUrl: null })
    ).resolves.toBe(false)
  })

  it("skips custom servers", async () => {
    answer(401)
    await expect(
      models.rejectsKey({
        provider: "openai_compatible",
        apiKey: "key",
        baseUrl: "https://ai.example/v1",
      })
    ).resolves.toBe(false)
    expect(fetch).not.toHaveBeenCalled()
  })
})
