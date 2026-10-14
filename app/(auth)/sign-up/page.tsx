import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { SignUpForm } from "@/components/auth/sign-up-form"
import { safeRedirect } from "@/lib/safe-redirect"
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
  if (!auth.signUpEnabled) {
    redirect(
      target === "/"
        ? "/sign-in"
        : `/sign-in?next=${encodeURIComponent(target)}`
    )
  }

  return <SignUpForm next={target} providers={auth.socialProviders} />
}
