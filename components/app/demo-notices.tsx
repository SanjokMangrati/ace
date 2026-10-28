import { InfoIcon } from "@phosphor-icons/react/ssr"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { DEMO_ACCOUNT } from "@/lib/demo"

export function DemoSignInNotice() {
  return (
    <Alert role="note">
      <InfoIcon weight="duotone" />
      <AlertDescription>
        This is a demo. Sign in as <b>{DEMO_ACCOUNT.email}</b> with the password{" "}
        <b>{DEMO_ACCOUNT.password}</b>.
      </AlertDescription>
    </Alert>
  )
}

export function DemoKeysNotice() {
  return (
    <Alert role="note">
      <InfoIcon weight="duotone" />
      <AlertDescription>
        <b>This is a shared demo.</b> Anyone who signs in can use the keys saved
        here. When you're done, remove your key and revoke it in your AI
        provider's account settings.
      </AlertDescription>
    </Alert>
  )
}
