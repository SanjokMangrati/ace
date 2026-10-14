import { Avatar, Style } from "@dicebear/core"
import moods from "@dicebear/styles/moods.json" with { type: "json" }
import type { AvatarPort } from "@/server/ports/avatars"

export function createDiceBearAdapter(): AvatarPort {
  const style = new Style(moods)

  return {
    teammate: (seed) =>
      new Avatar(style, {
        seed,
        backgroundColor: [],
        animationVariant: "none",
      }).toString(),
  }
}
