import type { CatalogModel, Provider, ProviderModels } from "@/lib/models"

export interface ModelCatalog {
  listAll(): Promise<ProviderModels>
  list(provider: Provider): Promise<CatalogModel[]>
  find(provider: Provider, modelId: string): Promise<CatalogModel | undefined>
}
