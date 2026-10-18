import { z } from "zod"
import { auth, blobs } from "@/server/container"
import { findScreenshot } from "@/server/db/queries/screenshots"

export async function GET(
  request: Request,
  { params }: RouteContext<"/api/screenshots/[id]">
) {
  const session = await auth.getSession(request.headers)
  if (!session) return new Response(null, { status: 401 })

  const id = z.uuid().safeParse((await params).id)
  if (!id.success) return new Response(null, { status: 404 })

  const data = await findScreenshot(blobs, session.user.id, id.data)
  if (!data) return new Response(null, { status: 404 })

  return new Response(new Uint8Array(data), {
    headers: {
      "Content-Type": "image/jpeg",
      "Cache-Control": "private, max-age=31536000, immutable",
      "Content-Security-Policy": "default-src 'none'",
      "X-Content-Type-Options": "nosniff",
    },
  })
}
