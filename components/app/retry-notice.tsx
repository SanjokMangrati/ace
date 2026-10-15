"use client"

import { ErrorNotice } from "@/components/app/error-notice"
import { Button } from "@/components/ui/button"

export function RetryNotice({ retry }: { retry: () => void }) {
  return (
    <ErrorNotice message="Something went wrong while loading this page.">
      <Button size="sm" onClick={() => retry()}>
        Try again
      </Button>
    </ErrorNotice>
  )
}
