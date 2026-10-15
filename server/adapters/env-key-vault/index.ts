import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto"
import type { KeyVault } from "@/server/ports/key-vault"

const algorithm = "aes-256-gcm"
const version = "v1"

export function createEnvKeyVault(encodedKey: string): KeyVault {
  const key = Buffer.from(encodedKey, "base64")
  if (key.length !== 32) {
    throw new Error("ENCRYPTION_KEY must be 32 bytes, base64 encoded.")
  }

  return {
    seal(secret) {
      const iv = randomBytes(12)
      const cipher = createCipheriv(algorithm, key, iv)
      const data = Buffer.concat([
        cipher.update(secret, "utf8"),
        cipher.final(),
      ])
      const tag = cipher.getAuthTag()
      return [version, iv, tag, data]
        .map((part) =>
          typeof part === "string" ? part : part.toString("base64url")
        )
        .join(".")
    },
    open(sealed) {
      const [prefix, iv, tag, data] = sealed.split(".")
      if (prefix !== version || !iv || !tag || !data) {
        throw new Error("Unrecognized sealed key format.")
      }
      const decipher = createDecipheriv(
        algorithm,
        key,
        Buffer.from(iv, "base64url")
      )
      decipher.setAuthTag(Buffer.from(tag, "base64url"))
      return Buffer.concat([
        decipher.update(Buffer.from(data, "base64url")),
        decipher.final(),
      ]).toString("utf8")
    },
  }
}
