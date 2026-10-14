import { type NextRequest, NextResponse } from "next/server"
import { hasSessionCookie } from "@/server/adapters/better-auth/session-cookie"

const publicPaths = ["/sign-in", "/sign-up"]

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl
  if (publicPaths.includes(pathname) || hasSessionCookie(request.headers)) {
    return NextResponse.next()
  }
  const url = new URL("/sign-in", request.url)
  if (pathname !== "/") url.searchParams.set("next", `${pathname}${search}`)
  return NextResponse.redirect(url)
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
}
