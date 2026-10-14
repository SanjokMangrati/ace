import { auth } from "@/server/container"

export function GET(request: Request) {
  return auth.handle(request)
}

export function POST(request: Request) {
  return auth.handle(request)
}
