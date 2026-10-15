import { InfoIcon } from "@phosphor-icons/react/ssr"
import Link from "next/link"
import { Alert, AlertAction, AlertDescription } from "@/components/ui/alert"
import { buttonVariants } from "@/components/ui/button"

export default function NotFound() {
  return (
    <main className="flex min-h-svh items-center justify-center px-4">
      <Alert role="status" className="max-w-95">
        <InfoIcon weight="duotone" />
        <AlertDescription>We couldn't find this page.</AlertDescription>
        <AlertAction>
          <Link href="/" className={buttonVariants({ size: "sm" })}>
            Go to Ace
          </Link>
        </AlertAction>
      </Alert>
    </main>
  )
}
