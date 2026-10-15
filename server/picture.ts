import { PICTURE_MAX_BYTES } from "@/lib/bot-schemas"

const signatures: { type: string; matches: (bytes: Buffer) => boolean }[] = [
  {
    type: "image/png",
    matches: (bytes) =>
      bytes
        .subarray(0, 8)
        .equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  },
  {
    type: "image/jpeg",
    matches: (bytes) =>
      bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff,
  },
  {
    type: "image/gif",
    matches: (bytes) => /^GIF8[79]a$/.test(bytes.subarray(0, 6).toString()),
  },
  {
    type: "image/webp",
    matches: (bytes) =>
      bytes.subarray(0, 4).toString() === "RIFF" &&
      bytes.subarray(8, 12).toString() === "WEBP",
  },
]

export type PictureResult =
  | { ok: true; data: Buffer; type: string }
  | { ok: false; message: string }

export function readPicture(bytes: Buffer): PictureResult {
  if (bytes.length === 0) {
    return { ok: false, message: "That picture is empty. Pick another one." }
  }
  if (bytes.length > PICTURE_MAX_BYTES) {
    return {
      ok: false,
      message: "That picture is too big. Pick one under 256 KB.",
    }
  }
  const match = signatures.find((signature) => signature.matches(bytes))
  if (!match) {
    return {
      ok: false,
      message: "Use a PNG, JPEG, WebP or GIF picture.",
    }
  }
  return { ok: true, data: bytes, type: match.type }
}
