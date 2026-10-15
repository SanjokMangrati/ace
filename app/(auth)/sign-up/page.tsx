import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { SignUpForm } from "@/components/auth/sign-up-form"
import { safeRedirect, withNext } from "@/lib/safe-redirect"
import { auth } from "@/server/container"
import { getSession } from "@/server/session"

export const metadata: Metadata = {
  title: "Create your Ace account",
}

export default async function SignUpPage({
  searchParams,
}: PageProps<"/sign-up">) {
  const { next } = await searchParams
  const target = safeRedirect(next)
  if (await getSession()) redirect(target)
  if (!auth.signUpEnabled) redirect(withNext("/sign-in", target))

  return <SignUpForm next={target} providers={auth.socialProviders} />
}
