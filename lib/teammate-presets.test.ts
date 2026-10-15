import { describe, expect, it } from "vitest"
import { botFormSchema } from "./bot-schemas"
import { findPreset, TEAMMATE_PRESETS } from "./teammate-presets"

const profileSchema = botFormSchema.pick({
  name: true,
  job: true,
  instructions: true,
})

describe("TEAMMATE_PRESETS", () => {
  it.each(TEAMMATE_PRESETS)(
    "$name passes the teammate form checks",
    (preset) => {
      const { id, ...profile } = preset
      expect(profileSchema.parse(profile)).toEqual(profile)
    }
  )

  it("has unique ids and names", () => {
    expect(new Set(TEAMMATE_PRESETS.map((preset) => preset.id)).size).toBe(
      TEAMMATE_PRESETS.length
    )
    expect(new Set(TEAMMATE_PRESETS.map((preset) => preset.name)).size).toBe(
      TEAMMATE_PRESETS.length
    )
  })
})

describe("findPreset", () => {
  it("finds a preset whose fields are unchanged", () => {
    const [writer] = TEAMMATE_PRESETS.filter((preset) => preset.id === "writer")
    expect(findPreset(writer)?.id).toBe("writer")
  })

  it("returns nothing once a field is edited", () => {
    const [writer] = TEAMMATE_PRESETS.filter((preset) => preset.id === "writer")
    expect(findPreset({ ...writer, name: "Penny" })).toBeUndefined()
  })
})
