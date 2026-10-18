import { describe, expect, it } from "vitest"
import { PROVIDERS } from "@/lib/models"
import type { ModelCatalog } from "@/server/ports/model-catalog"

export function modelCatalogContract(name: string, make: () => ModelCatalog) {
  describe(`${name} ModelCatalog contract`, () => {
    it("lists models with a name, prices and vision for every provider", async () => {
      const all = await make().listAll()
      expect(Object.keys(all).sort()).toEqual([...PROVIDERS].sort())
      expect(all.anthropic.length).toBeGreaterThan(0)
      for (const model of Object.values(all).flat()) {
        expect(model).toEqual({
          id: expect.any(String),
          label: expect.any(String),
          vision: expect.any(Boolean),
          inputUsdPerMTok: expect.any(Number),
          outputUsdPerMTok: expect.any(Number),
        })
      }
    })

    it("finds a listed model and nothing for an unknown id", async () => {
      const catalog = make()
      const [first] = await catalog.list("anthropic")
      expect(await catalog.find("anthropic", first.id)).toEqual(first)
      expect(await catalog.find("anthropic", "no-such-model")).toBeUndefined()
    })
  })
}
