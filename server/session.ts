import "server-only"
import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { cache } from "react"
import { auth } from "@/server/container"

export const getSession = cache(async () => auth.getSession(await headers()))

export const requireUser = cache(async () => {
  const session = await getSession()
  if (!session) redirect("/sign-in")
  return session.user
})
