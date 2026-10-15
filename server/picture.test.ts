import { describe, expect, it } from "vitest"
import { PICTURE_MAX_BYTES } from "@/lib/bot-schemas"
import { readPicture } from "./picture"

const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0])
const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0])
const gif = Buffer.from("GIF89a\0\0")
const webp = Buffer.concat([
  Buffer.from("RIFF"),
  Buffer.from([0, 0, 0, 0]),
  Buffer.from("WEBPVP8 "),
])

describe("readPicture", () => {
  it.each([
    ["image/png", png],
    ["image/jpeg", jpeg],
    ["image/gif", gif],
    ["image/webp", webp],
  ])("detects %s from its bytes", (type, bytes) => {
    expect(readPicture(bytes)).toMatchObject({ ok: true, type })
  })

  it("rejects svg even when named like an image", () => {
    expect(
      readPicture(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>'))
    ).toEqual({ ok: false, message: "Use a PNG, JPEG, WebP or GIF picture." })
  })

  it("rejects empty and oversized files", () => {
    expect(readPicture(Buffer.alloc(0)).ok).toBe(false)
    const big = Buffer.concat([png, Buffer.alloc(PICTURE_MAX_BYTES)])
    expect(readPicture(big)).toEqual({
      ok: false,
      message: "That picture is too big. Pick one under 256 KB.",
    })
  })
})
