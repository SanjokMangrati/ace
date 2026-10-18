import { randomUUID } from "node:crypto"
import type { KeyVault } from "@/server/ports/key-vault"

export function createFakeKeyVault(): KeyVault {
  return {
    seal: (secret) =>
      `fake.${randomUUID()}.${Buffer.from(secret).toString("base64url")}`,
    open: (sealed) => {
      const [prefix, nonce, data] = sealed.split(".")
      if (prefix !== "fake" || !nonce || data === undefined) {
        throw new Error("Unrecognized sealed key format.")
      }
      return Buffer.from(data, "base64url").toString("utf8")
    },
  }
}
