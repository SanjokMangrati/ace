import type { AvatarPort } from "@/server/ports/avatars"

export function createFakeAvatars(): AvatarPort {
  return {
    teammate: (seed) =>
      `<svg xmlns="http://www.w3.org/2000/svg"><title>${encodeURIComponent(seed)}</title></svg>`,
  }
}
