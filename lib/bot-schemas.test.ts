import { describe, expect, it } from "vitest"
import {
  type BotFormInput,
  botFormSchema,
  cappedLimits,
  DEFAULT_ASK_BEFORE,
  DEFAULT_LIMITS,
  LIMIT_CEILINGS,
  NEW_KEY,
  type TeammateFormInput,
  teammateFormSchema,
} from "./bot-schemas"
import { emptyProviderKey } from "./provider-key-schemas"

const valid: BotFormInput = {
  name: "Researcher",
  job: "Finds sources and checks the numbers",
  instructions: "",
  providerKeyId: "5b0c1d3e-8f4a-4b2c-9d6e-7f8a9b0c1d2e",
  modelId: "claude-sonnet-5-5",
  fullAuto: false,
  ...DEFAULT_LIMITS,
  askBefore: DEFAULT_ASK_BEFORE,
}

function messages(value: unknown, caps = LIMIT_CEILINGS) {
  const result = botFormSchema(caps).safeParse(value)
  return result.error?.issues.map((issue) => issue.message) ?? []
}

describe("botFormSchema", () => {
  it("accepts a complete teammate and trims text", () => {
    expect(
      botFormSchema().parse({ ...valid, name: "  Researcher  ", job: " Job " })
    ).toMatchObject({ name: "Researcher", job: "Job" })
  })

  it("asks for a name, job, provider and model", () => {
    expect(
      messages({ ...valid, name: " ", job: "", providerKeyId: "", modelId: "" })
    ).toEqual([
      "Give your teammate a name.",
      "Say in a few words what this teammate does.",
      "Pick an AI provider.",
      "Pick a model.",
    ])
  })

  it("rejects a missing provider key", () => {
    expect(messages({ ...valid, providerKeyId: null })).toEqual([
      "Pick an AI provider.",
    ])
  })

  it("bounds the step limit", () => {
    expect(messages({ ...valid, maxSteps: 0 })).toEqual([
      "Allow at least 1 step.",
    ])
    expect(
      messages({ ...valid, maxSteps: LIMIT_CEILINGS.maxSteps + 1 })
    ).toEqual([`Keep it at ${LIMIT_CEILINGS.maxSteps} steps or fewer.`])
    expect(messages({ ...valid, maxSteps: 2.5 })).toEqual([
      "Use a whole number of steps.",
    ])
    expect(messages({ ...valid, maxSteps: Number.NaN })).toEqual([
      "Enter a number of steps, like 50.",
    ])
  })

  it("bounds spending", () => {
    expect(messages({ ...valid, taskBudgetUsd: 0 })).toEqual([
      "Spend at least $0.01 on one task.",
    ])
    expect(messages({ ...valid, dailyBudgetUsd: Number.NaN })).toEqual([
      "Enter an amount for a day, like 1.00.",
    ])
    expect(messages({ ...valid, dailyBudgetUsd: null })).toEqual([
      "Enter an amount for a day, like 1.00.",
    ])
  })

  it("holds the limits to the caps this Ace sets", () => {
    const caps = { maxSteps: 20, taskBudgetUsd: 2, dailyBudgetUsd: 3 }
    expect(
      messages(
        { ...valid, maxSteps: 21, taskBudgetUsd: 2.5, dailyBudgetUsd: 4 },
        caps
      )
    ).toEqual([
      "Keep it at 20 steps or fewer.",
      "Keep it at $2 or less on one task.",
      "Keep it at $3 or less a day.",
    ])
    expect(
      cappedLimits({ maxSteps: 50, taskBudgetUsd: 1, dailyBudgetUsd: 5 }, caps)
    ).toEqual({
      maxSteps: 20,
      taskBudgetUsd: 1,
      dailyBudgetUsd: 3,
    })
  })

  it("requires every ask-before choice", () => {
    const { shell: _shell, ...rest } = DEFAULT_ASK_BEFORE
    expect(
      botFormSchema().safeParse({ ...valid, askBefore: rest }).success
    ).toBe(false)
  })
})

describe("teammateFormSchema", () => {
  const form: TeammateFormInput = {
    ...valid,
    newKey: emptyProviderKey(),
  }

  it("ignores the new key fields when a saved key is picked", () => {
    expect(teammateFormSchema().safeParse(form).success).toBe(true)
  })

  it("checks the new key when adding one", () => {
    const result = teammateFormSchema().safeParse({
      ...form,
      providerKeyId: NEW_KEY,
    })
    expect(
      result.error?.issues.map((issue) => [issue.path.join("."), issue.message])
    ).toEqual([["newKey.apiKey", "Paste the key from your Anthropic account."]])
  })

  it("accepts a complete new key", () => {
    expect(
      teammateFormSchema().safeParse({
        ...form,
        providerKeyId: NEW_KEY,
        newKey: { ...form.newKey, apiKey: "sk-ant-0123456789abcdefghij" },
      }).success
    ).toBe(true)
  })

  it("asks for a provider when none is picked", () => {
    expect(
      teammateFormSchema()
        .safeParse({ ...form, providerKeyId: "" })
        .error?.issues.map((issue) => issue.message)
    ).toEqual(["Pick an AI provider."])
  })
})
