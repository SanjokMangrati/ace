import { z } from "zod"
import {
  type CatalogModel,
  PROVIDERS,
  type Provider,
  type ProviderModels,
} from "@/lib/models"
import type { ModelCatalog } from "@/server/ports/model-catalog"

type DirectProvider = Exclude<Provider, "openai_compatible">

const MODELS_URL = "https://ai-gateway.vercel.sh/v1/models"
const REVALIDATE_SECONDS = 60 * 60 * 24
const GATEWAY_VARIANT = /-(batch|fast)$/

const modelsSchema = z.object({
  data: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      type: z.string(),
      released: z.number().default(0),
      tags: z.array(z.string()).default([]),
      deprecated_at: z.number().nullish(),
    })
  ),
})

const endpointsSchema = z.object({
  data: z.object({
    endpoints: z.array(
      z.object({
        provider_name: z.string(),
        tags: z.array(z.string()).default([]),
        pricing: z.object({
          prompt: z.coerce.number(),
          completion: z.coerce.number(),
        }),
      })
    ),
  }),
})

type GatewayModel = z.output<typeof modelsSchema>["data"][number]

async function fetchJson<S extends z.ZodType>(
  url: string,
  schema: S
): Promise<z.output<S>> {
  const response = await fetch(url, {
    next: { revalidate: REVALIDATE_SECONDS },
  })
  if (!response.ok) {
    throw new Error(`AI Gateway answered ${response.status} for ${url}`)
  }
  return schema.parse(await response.json())
}

function nativeModelId(provider: DirectProvider, model: GatewayModel) {
  const slug = model.id.slice(provider.length + 1)
  return provider === "anthropic" ? slug.replaceAll(".", "-") : slug
}

async function candidates(provider: DirectProvider) {
  const { data } = await fetchJson(MODELS_URL, modelsSchema)
  return data
    .filter(
      (model) =>
        model.id.startsWith(`${provider}/`) &&
        model.type === "language" &&
        model.tags.includes("tool-use") &&
        !model.deprecated_at &&
        !GATEWAY_VARIANT.test(model.id)
    )
    .sort((a, b) => b.released - a.released)
}

async function toCatalogModel(
  provider: DirectProvider,
  model: GatewayModel
): Promise<CatalogModel | undefined> {
  const { data } = await fetchJson(
    `${MODELS_URL}/${model.id}/endpoints`,
    endpointsSchema
  )
  const direct = data.endpoints.find(
    (endpoint) => endpoint.provider_name === provider
  )
  if (!direct) return undefined
  return {
    id: nativeModelId(provider, model),
    label: model.name,
    vision: direct.tags.includes("vision"),
    inputUsdPerMTok: direct.pricing.prompt * 1_000_000,
    outputUsdPerMTok: direct.pricing.completion * 1_000_000,
  }
}

async function list(provider: Provider) {
  if (provider === "openai_compatible") return []
  const models = await Promise.all(
    (await candidates(provider)).map((model) => toCatalogModel(provider, model))
  )
  return models.filter((model) => model !== undefined)
}

export function createAiGatewayCatalog(): ModelCatalog {
  return {
    list,
    async listAll() {
      const lists = await Promise.all(PROVIDERS.map(list))
      return Object.fromEntries(
        PROVIDERS.map((provider, index) => [provider, lists[index]])
      ) as ProviderModels
    },
    async find(provider, modelId) {
      if (provider === "openai_compatible") return undefined
      const model = (await candidates(provider)).find(
        (candidate) => nativeModelId(provider, candidate) === modelId
      )
      return model && toCatalogModel(provider, model)
    },
  }
}
