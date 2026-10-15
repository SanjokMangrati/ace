"use client"

import { Page } from "@/components/app/page"
import { RetryNotice } from "@/components/app/retry-notice"

export default function AppError({ retry }: { retry: () => void }) {
  return (
    <Page>
      <RetryNotice retry={retry} />
    </Page>
  )
}
