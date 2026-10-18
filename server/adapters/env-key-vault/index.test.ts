import { randomBytes } from "node:crypto"
import { describe, expect, it } from "vitest"
import { createEnvKeyVault } from "."

const key = randomBytes(32).toString("base64")

describe("createEnvKeyVault", () => {
  it("rejects tampered data", () => {
    const vault = createEnvKeyVault(key)
    const [prefix, iv, tag, data] = vault.seal("secret").split(".")
    const flipped = Buffer.from(data, "base64url")
    flipped[0] ^= 1
    expect(() =>
      vault.open([prefix, iv, tag, flipped.toString("base64url")].join("."))
    ).toThrow()
  })

  it("rejects a different key", () => {
    const sealed = createEnvKeyVault(key).seal("secret")
    const other = createEnvKeyVault(randomBytes(32).toString("base64"))
    expect(() => other.open(sealed)).toThrow()
  })

  it("requires a 32-byte key", () => {
    expect(() =>
      createEnvKeyVault(randomBytes(16).toString("base64"))
    ).toThrow()
  })
})
