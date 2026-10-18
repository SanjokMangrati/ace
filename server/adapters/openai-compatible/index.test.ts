import { afterEach, describe, expect, it, vi } from "vitest"
import { createOpenAiCompatibleCatalog } from "."

const catalog = createOpenAiCompatibleCatalog()

function answer(body: unknown, status = 200) {
  const fetch = vi.fn(
    async (_url: string, _init?: RequestInit) =>
      new Response(JSON.stringify(body), { status })
  )
  vi.stubGlobal("fetch", fetch)
  return fetch
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("list", () => {
  it("reads OpenRouter models that can use tools, newest first", async () => {
    const fetch = answer({
      data: [
        {
          id: "openai/gpt-old",
          name: "OpenAI: GPT Old",
          created: 1,
          architecture: { input_modalities: ["text"] },
          supported_parameters: ["tools"],
          pricing: { prompt: "0.000001", completion: "0.000002" },
        },
        {
          id: "meta/no-tools",
          created: 3,
          supported_parameters: ["temperature"],
        },
        {
          id: "anthropic/claude-new",
          name: "Anthropic: Claude New",
          created: 2,
          architecture: { input_modalities: ["text", "image"] },
          supported_parameters: ["tools"],
          pricing: { prompt: "-1", completion: "-1" },
        },
      ],
    })

    const models = await catalog.list({
      baseUrl: "https://openrouter.ai/api/v1/",
      apiKey: "sk-or",
    })

    expect(fetch.mock.calls[0][0]).toBe("https://openrouter.ai/api/v1/models")
    expect(fetch.mock.calls[0][1]?.headers).toEqual({
      Authorization: "Bearer sk-or",
    })
    expect(models).toEqual([
      {
        id: "anthropic/claude-new",
        label: "Anthropic: Claude New",
        vision: true,
        inputUsdPerMTok: 0,
        outputUsdPerMTok: 0,
      },
      {
        id: "openai/gpt-old",
        label: "OpenAI: GPT Old",
        vision: false,
        inputUsdPerMTok: 1,
        outputUsdPerMTok: 2,
      },
    ])
  })

  it("keeps every model from a plain OpenAI-compatible server", async () => {
    const fetch = answer({
      data: [{ id: "llama3.1", object: "model", owned_by: "ollama" }],
    })

    const models = await catalog.list({
      baseUrl: "http://localhost:11434/v1",
      apiKey: undefined,
    })

    expect(fetch.mock.calls[0][1]?.headers).toBeUndefined()
    expect(models).toEqual([
      {
        id: "llama3.1",
        label: "llama3.1",
        vision: false,
        inputUsdPerMTok: 0,
        outputUsdPerMTok: 0,
      },
    ])
  })

  it("fails when the server turns the request down", async () => {
    answer({ error: "nope" }, 401)
    await expect(
      catalog.list({ baseUrl: "https://ai.example/v1", apiKey: "bad" })
    ).rejects.toThrow("401")
  })
})
