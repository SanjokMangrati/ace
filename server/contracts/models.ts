import { describe, expect, it } from "vitest"
import type { ModelRegistry, ProviderCredentials } from "@/server/ports/models"

export function modelRegistryContract(
  name: string,
  make: () => {
    models: ModelRegistry
    rejected: ProviderCredentials
    modelId: string
  }
) {
  describe(`${name} ModelRegistry contract`, () => {
    it("builds the model it was asked for", () => {
      const { models, rejected, modelId } = make()
      const model = models.languageModel(rejected, modelId)
      expect(typeof model === "string" ? model : model.modelId).toBe(modelId)
    })

    it("rejects a key the provider refuses", async () => {
      const { models, rejected } = make()
      expect(await models.rejectsKey(rejected)).toBe(true)
    })
  })
}
