import { randomBytes } from "node:crypto"
import { keyVaultContract } from "@/server/contracts/key-vault"
import { createEnvKeyVault } from "."

keyVaultContract("AES-256-GCM", () =>
  createEnvKeyVault(randomBytes(32).toString("base64"))
)
