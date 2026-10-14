"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { FormError } from "@/components/form/form-error"
import { PasswordField } from "@/components/form/password-field"
import { SubmitButton } from "@/components/form/submit-button"
import { TextField } from "@/components/form/text-field"
import { FieldSeparator } from "@/components/ui/field"
import { TextLink } from "@/components/ui/text-link"
import { type SignInInput, signInSchema } from "@/lib/auth-schemas"
import type { SocialProvider } from "@/server/ports/auth"
import { authClient, authErrorMessage } from "./auth-client"
import { AUTH_TITLE_ID, AuthHeader } from "./auth-header"
import { SocialSignIn } from "./social-sign-in"

export function SignInForm({
  next,
  providers,
  signUpEnabled,
  initialError,
}: {
  next: string
  providers: readonly SocialProvider[]
  signUpEnabled: boolean
  initialError?: string
}) {
  const form = useForm<SignInInput>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: "", password: "" },
  })

  async function onSubmit(values: SignInInput) {
    const { error } = await authClient.signIn.email(values)
    if (error) {
      form.resetField("password")
      form.setError("root", { message: authErrorMessage(error) })
      return
    }
    window.location.replace(next)
  }

  const signUpHref =
    next === "/" ? "/sign-up" : `/sign-up?next=${encodeURIComponent(next)}`

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      noValidate
      aria-labelledby={AUTH_TITLE_ID}
      className="flex flex-col gap-5"
    >
      <AuthHeader
        title="Welcome back"
        description="Sign in to see what your teammates are up to."
      />
      <FormError control={form.control} initialMessage={initialError} />
      <TextField
        control={form.control}
        name="email"
        label="Email"
        type="email"
        autoComplete="email"
        placeholder="you@example.com"
      />
      <PasswordField
        control={form.control}
        name="password"
        label="Password"
        autoComplete="current-password"
      />
      <SubmitButton control={form.control} className="w-full">
        Sign in
      </SubmitButton>
      {providers.length > 0 && (
        <>
          <FieldSeparator>or</FieldSeparator>
          <SocialSignIn providers={providers} next={next} />
        </>
      )}
      {signUpEnabled && (
        <p className="mt-1 text-center text-ink-2">
          New to Ace? <TextLink href={signUpHref}>Create an account</TextLink>
        </p>
      )}
    </form>
  )
}
