import { z } from "zod"
import type { CatalogModel } from "@/lib/models"
import type { ServerModelCatalog } from "@/server/ports/model-catalog"

const REVALIDATE_SECONDS = 60 * 60
const TIMEOUT_MS = 5_000

const modelsSchema = z.object({
  data: z.array(
    z.object({
      id: z.string(),
      name: z.string().optional(),
      created: z.number().default(0),
      architecture: z
        .object({ input_modalities: z.array(z.string()).default([]) })
        .optional(),
      supported_parameters: z.array(z.string()).optional(),
      pricing: z
        .object({ prompt: z.coerce.number(), completion: z.coerce.number() })
        .optional(),
    })
  ),
})

export function createOpenAiCompatibleCatalog(): ServerModelCatalog {
  return {
    async list({ baseUrl, apiKey }) {
      const response = await fetch(`${baseUrl.replace(/\/+$/, "")}/models`, {
        headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : undefined,
        redirect: "error",
        signal: AbortSignal.timeout(TIMEOUT_MS),
        next: { revalidate: REVALIDATE_SECONDS },
      })
      if (!response.ok) {
        throw new Error(`${baseUrl} answered ${response.status} for /models`)
      }
      const { data } = modelsSchema.parse(await response.json())
      return data
        .filter(
          (model) =>
            !model.supported_parameters ||
            model.supported_parameters.includes("tools")
        )
        .sort((a, b) => b.created - a.created)
        .map(
          (model): CatalogModel => ({
            id: model.id,
            label: model.name ?? model.id,
            vision:
              model.architecture?.input_modalities.includes("image") ?? false,
            inputUsdPerMTok:
              Math.max(model.pricing?.prompt ?? 0, 0) * 1_000_000,
            outputUsdPerMTok:
              Math.max(model.pricing?.completion ?? 0, 0) * 1_000_000,
          })
        )
    },
  }
}
