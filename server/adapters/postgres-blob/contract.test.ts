import { vi } from "vitest"
import { blobStoreContract } from "@/server/contracts/blob-store"
import { createPostgresBlobStore } from "."

vi.mock("@/server/db/client")

blobStoreContract("Postgres", createPostgresBlobStore)
