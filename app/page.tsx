import { UserMenu } from "@/components/auth/user-menu"
import { requireUser } from "@/server/session"

export default async function Page() {
  const user = await requireUser()

  return (
    <div className="flex min-h-svh flex-col">
      <header className="flex items-center justify-between border-b px-4 py-2">
        <span className="font-medium">Ace</span>
        <UserMenu user={user} />
      </header>
      <main className="flex-1" />
    </div>
  )
}
