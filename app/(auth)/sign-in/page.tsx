import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { SignInForm } from "@/components/auth/sign-in-form"
import { safeRedirect } from "@/lib/safe-redirect"
import { auth } from "@/server/container"
import { getSession } from "@/server/session"

export const metadata: Metadata = {
  title: "Sign in to Ace",
}

const oauthErrors: Record<string, string> = {
  account_not_linked:
    "We couldn't sign you in with this provider. Try another sign-in method.",
  signup_disabled: "Sign-ups are turned off on this server.",
}

export default async function SignInPage({
  searchParams,
}: PageProps<"/sign-in">) {
  const { next, error } = await searchParams
  const target = safeRedirect(next)
  if (await getSession()) redirect(target)

  const initialError =
    typeof error === "string"
      ? (oauthErrors[error] ?? "Sign-in failed. Try again.")
      : undefined

  return (
    <SignInForm
      next={target}
      providers={auth.socialProviders}
      signUpEnabled={auth.signUpEnabled}
      initialError={initialError}
    />
  )
}
