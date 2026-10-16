import { WarningCircleIcon } from "@phosphor-icons/react/ssr"
import type * as React from "react"
import { Alert, AlertAction, AlertDescription } from "@/components/ui/alert"

export function ErrorNotice({
  message,
  className,
  children,
}: {
  message: React.ReactNode
  className?: string
  children?: React.ReactNode
}) {
  return (
    <Alert variant="danger" className={className}>
      <WarningCircleIcon weight="duotone" />
      <AlertDescription>{message}</AlertDescription>
      {children && <AlertAction>{children}</AlertAction>}
    </Alert>
  )
}
