"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { FormError } from "@/components/form/form-error"
import { PasswordField } from "@/components/form/password-field"
import { SubmitButton } from "@/components/form/submit-button"
import { TextField } from "@/components/form/text-field"
import { FieldSeparator } from "@/components/ui/field"
import { TextLink } from "@/components/ui/text-link"
import {
  PASSWORD_MIN_LENGTH,
  type SignUpInput,
  signUpSchema,
} from "@/lib/auth-schemas"
import type { SocialProvider } from "@/server/ports/auth"
import { authClient, authErrorMessage } from "./auth-client"
import { AUTH_TITLE_ID, AuthHeader } from "./auth-header"
import { SocialSignIn } from "./social-sign-in"

export function SignUpForm({
  next,
  providers,
}: {
  next: string
  providers: readonly SocialProvider[]
}) {
  const form = useForm<SignUpInput>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { name: "", email: "", password: "" },
  })

  async function onSubmit(values: SignUpInput) {
    const { error } = await authClient.signUp.email(values)
    if (error) {
      form.setError("root", { message: authErrorMessage(error) })
      return
    }
    window.location.replace(next)
  }

  const signInHref =
    next === "/" ? "/sign-in" : `/sign-in?next=${encodeURIComponent(next)}`

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      noValidate
      aria-labelledby={AUTH_TITLE_ID}
      className="flex flex-col gap-5"
    >
      <AuthHeader
        title="Create your account"
        description="Next, you'll set up your first teammate."
      />
      <FormError control={form.control} />
      <TextField
        control={form.control}
        name="name"
        label="Your name"
        autoComplete="name"
        placeholder="Sam Rivera"
      />
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
        autoComplete="new-password"
        description={`At least ${PASSWORD_MIN_LENGTH} characters.`}
      />
      <SubmitButton control={form.control} className="w-full">
        Create account
      </SubmitButton>
      {providers.length > 0 && (
        <>
          <FieldSeparator>or</FieldSeparator>
          <SocialSignIn providers={providers} next={next} />
        </>
      )}
      <p className="mt-1 text-center text-ink-2">
        Already have an account? <TextLink href={signInHref}>Sign in</TextLink>
      </p>
    </form>
  )
}
