"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import Link from "next/link"
import { useForm } from "react-hook-form"
import { FormError } from "@/components/form/form-error"
import { SubmitButton } from "@/components/form/submit-button"
import { TextField } from "@/components/form/text-field"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldSeparator,
} from "@/components/ui/field"
import { type SignInInput, signInSchema } from "@/lib/auth-schemas"
import type { SocialProvider } from "@/server/ports/auth"
import { authClient, authErrorMessage } from "./auth-client"
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
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-xl">Welcome back</CardTitle>
        <CardDescription>Sign in to your Ace account</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
          <FieldGroup>
            <FormError control={form.control} initialMessage={initialError} />
            {providers.length > 0 && (
              <>
                <SocialSignIn providers={providers} next={next} />
                <FieldSeparator className="*:data-[slot=field-separator-content]:bg-card">
                  Or continue with
                </FieldSeparator>
              </>
            )}
            <TextField
              control={form.control}
              name="email"
              label="Email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
            />
            <TextField
              control={form.control}
              name="password"
              label="Password"
              type="password"
              autoComplete="current-password"
            />
            <Field>
              <SubmitButton control={form.control}>Sign in</SubmitButton>
              {signUpEnabled && (
                <FieldDescription className="text-center">
                  Don&apos;t have an account?{" "}
                  <Link href={signUpHref}>Sign up</Link>
                </FieldDescription>
              )}
            </Field>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  )
}
