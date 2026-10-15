import { WarningCircleIcon } from "@phosphor-icons/react/ssr"
import type * as React from "react"
import { Alert, AlertAction, AlertDescription } from "@/components/ui/alert"

export function ErrorNotice({
  message,
  children,
}: {
  message: React.ReactNode
  children?: React.ReactNode
}) {
  return (
    <Alert variant="danger">
      <WarningCircleIcon weight="duotone" />
      <AlertDescription>{message}</AlertDescription>
      {children && <AlertAction>{children}</AlertAction>}
    </Alert>
  )
}
