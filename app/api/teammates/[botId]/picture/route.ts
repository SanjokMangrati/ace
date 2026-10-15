import { botIdSchema } from "@/lib/bot-schemas"
import { auth } from "@/server/container"
import { findBotPicture } from "@/server/db/queries/bots"

export async function GET(
  request: Request,
  { params }: RouteContext<"/api/teammates/[botId]/picture">
) {
  const session = await auth.getSession(request.headers)
  if (!session) return new Response(null, { status: 401 })

  const { botId } = await params
  const id = botIdSchema.safeParse(botId)
  if (!id.success) return new Response(null, { status: 404 })

  const picture = await findBotPicture(session.user.id, id.data)
  if (!picture) return new Response(null, { status: 404 })

  return new Response(new Uint8Array(picture.data), {
    headers: {
      "Content-Type": picture.type,
      "Cache-Control": "private, max-age=31536000, immutable",
      "Content-Security-Policy": "default-src 'none'",
      "X-Content-Type-Options": "nosniff",
    },
  })
}
