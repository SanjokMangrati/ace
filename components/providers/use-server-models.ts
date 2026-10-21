"use client"

import { useState } from "react"
import { listServerModels } from "@/app/(app)/providers/actions"
import type { CatalogModel } from "@/lib/models"

export function useServerModels() {
  const [models, setModels] = useState<CatalogModel[]>([])

  function load(baseUrl: string | null, apiKey: string) {
    listServerModels(baseUrl ?? "", apiKey)
      .then(setModels)
      .catch(() => setModels([]))
  }

  return { models, load }
}
