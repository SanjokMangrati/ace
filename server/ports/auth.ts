export type SocialProvider = "github"

export type AuthUser = {
  id: string
  name: string
  email: string
  image: string | null
}

export interface AuthPort {
  readonly socialProviders: readonly SocialProvider[]
  readonly signUpEnabled: boolean
  handle(request: Request): Promise<Response>
  getSession(headers: Headers): Promise<{ user: AuthUser } | null>
}
