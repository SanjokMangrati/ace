import { describe, expect, it } from "vitest"
import type { KeyVault } from "@/server/ports/key-vault"

export function keyVaultContract(name: string, make: () => KeyVault) {
  describe(`${name} KeyVault contract`, () => {
    it("opens what it sealed", () => {
      const vault = make()
      const secret = "sk-ant-api03-ünïcödé-key"
      expect(vault.open(vault.seal(secret))).toBe(secret)
    })

    it("never shows the secret and seals it differently each time", () => {
      const vault = make()
      const first = vault.seal("sk-secret-value")
      expect(first).not.toContain("sk-secret-value")
      expect(vault.seal("sk-secret-value")).not.toBe(first)
    })

    it("refuses a value it did not seal", () => {
      expect(() => make().open("not-a-sealed-key")).toThrow()
    })
  })
}
