import { describe, expect, it } from "vitest"
import { providerKeyFormSchema } from "./provider-key-schemas"

const empty = { baseUrl: "", judgeModelId: "", apiKey: "" }

function messages(value: unknown) {
  const result = providerKeyFormSchema.safeParse(value)
  return result.error?.issues.map((issue) => issue.message) ?? []
}

describe("providerKeyFormSchema", () => {
  it("accepts a full key and trims it", () => {
    expect(
      providerKeyFormSchema.parse({
        ...empty,
        provider: "anthropic",
        apiKey: "  sk-ant-api03-abcdefghijklmnop  ",
      })
    ).toMatchObject({ apiKey: "sk-ant-api03-abcdefghijklmnop" })
  })

  it("asks for a key from the named provider", () => {
    expect(messages({ ...empty, provider: "openai" })).toEqual([
      "Paste the key from your OpenAI account.",
    ])
  })

  it("flags incomplete keys", () => {
    expect(
      messages({ ...empty, provider: "anthropic", apiKey: "sk-ant-api03-" })
    ).toEqual([
      "That key looks incomplete. Copy the whole key from your Anthropic account.",
    ])
  })

  it("needs an http address for a custom server, key optional", () => {
    expect(messages({ ...empty, provider: "openai_compatible" })).toEqual([
      "Enter your server's address, like https://ai.your-company.example/v1.",
    ])
    expect(
      messages({
        ...empty,
        provider: "openai_compatible",
        baseUrl: "file:///etc/passwd",
      })
    ).toHaveLength(1)
    expect(
      messages({
        ...empty,
        provider: "openai_compatible",
        baseUrl: "http://10.0.0.12:8000/v1",
      })
    ).toEqual([])
  })

  it("rejects unknown providers", () => {
    expect(
      providerKeyFormSchema.safeParse({ ...empty, provider: "acme" }).success
    ).toBe(false)
  })
})
