import { avatars } from "@/server/container"

const maxSeedLength = 128

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ seed: string }> }
) {
  const { seed } = await params
  if (seed.length > maxSeedLength) {
    return new Response(null, { status: 400 })
  }
  return new Response(avatars.teammate(seed), {
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "public, max-age=31536000, immutable",
      "Content-Security-Policy":
        "default-src 'none'; style-src 'unsafe-inline'",
      "X-Content-Type-Options": "nosniff",
    },
  })
}
