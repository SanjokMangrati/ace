import { UserMenu } from "@/components/auth/user-menu"
import { Wordmark } from "@/components/brand/wordmark"
import { requireUser } from "@/server/session"

export default async function Page() {
  const user = await requireUser()

  return (
    <div className="flex min-h-svh flex-col">
      <header className="flex items-center justify-between border-b border-line px-6 py-3">
        <Wordmark />
        <UserMenu user={user} />
      </header>
      <main className="flex-1" />
    </div>
  )
}
