import { describe, expect, it } from "vitest"
import type { AvatarPort } from "@/server/ports/avatars"

export function avatarsContract(name: string, make: () => AvatarPort) {
  describe(`${name} AvatarPort contract`, () => {
    it("draws the same SVG for the same seed and another for another", () => {
      const avatars = make()
      const face = avatars.teammate("bot-1")
      expect(face).toMatch(/^<svg[\s>]/)
      expect(avatars.teammate("bot-1")).toBe(face)
      expect(avatars.teammate("bot-2")).not.toBe(face)
    })
  })
}
