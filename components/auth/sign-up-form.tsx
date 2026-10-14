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
import {
  PASSWORD_MIN_LENGTH,
  type SignUpInput,
  signUpSchema,
} from "@/lib/auth-schemas"
import type { SocialProvider } from "@/server/ports/auth"
import { authClient, authErrorMessage } from "./auth-client"
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
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-xl">Create your account</CardTitle>
        <CardDescription>Start building AI teammates with Ace</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
          <FieldGroup>
            <FormError control={form.control} />
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
              name="name"
              label="Name"
              autoComplete="name"
            />
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
              autoComplete="new-password"
              description={`At least ${PASSWORD_MIN_LENGTH} characters.`}
            />
            <Field>
              <SubmitButton control={form.control}>Create account</SubmitButton>
              <FieldDescription className="text-center">
                Already have an account? <Link href={signInHref}>Sign in</Link>
              </FieldDescription>
            </Field>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  )
}
