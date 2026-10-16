"use client"

import { GithubLogoIcon } from "@phosphor-icons/react/ssr"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Field, FieldError } from "@/components/ui/field"
import { Spinner } from "@/components/ui/spinner"
import type { SocialProvider } from "@/server/ports/auth"
import { authClient, authErrorMessage } from "./auth-client"

const labels: Record<SocialProvider, string> = {
  github: "Continue with GitHub",
}

const icons: Record<SocialProvider, typeof GithubLogoIcon> = {
  github: GithubLogoIcon,
}

export function SocialSignIn({
  providers,
  next,
}: {
  providers: readonly SocialProvider[]
  next: string
}) {
  const [pending, setPending] = useState<SocialProvider | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function signIn(provider: SocialProvider) {
    setPending(provider)
    setError(null)
    const origin = window.location.origin
    const { error } = await authClient.signIn.social({
      provider,
      callbackURL: new URL(next, origin).toString(),
      errorCallbackURL: new URL("/sign-in", origin).toString(),
    })
    if (error) {
      setError(authErrorMessage(error))
      setPending(null)
    }
  }

  return (
    <Field>
      {providers.map((provider) => {
        const ProviderIcon = icons[provider]
        return (
          <Button
            key={provider}
            type="button"
            variant="secondary"
            disabled={pending !== null}
            onClick={() => signIn(provider)}
          >
            {pending === provider ? (
              <Spinner data-icon="inline-start" className="size-4.5" />
            ) : (
              <ProviderIcon
                weight="duotone"
                data-icon="inline-start"
                className="size-4.5"
              />
            )}
            {labels[provider]}
          </Button>
        )
      })}
      <FieldError>{error}</FieldError>
    </Field>
  )
}
