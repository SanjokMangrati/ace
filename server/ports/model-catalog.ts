import type { CatalogModel, Provider, ProviderModels } from "@/lib/models"

export interface ModelCatalog {
  listAll(): Promise<ProviderModels>
  find(provider: Provider, modelId: string): Promise<CatalogModel | undefined>
}
