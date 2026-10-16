export type SocialProvider = "github"

export type AuthUser = {
  id: string
  name: string
  email: string
  image: string | null
}

type AuthSession = {
  id: string
  expiresAt: Date
  user: AuthUser
}

export interface AuthPort {
  readonly socialProviders: readonly SocialProvider[]
  readonly signUpEnabled: boolean
  handle(request: Request): Promise<Response>
  getSession(headers: Headers): Promise<AuthSession | null>
}
