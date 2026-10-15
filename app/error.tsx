"use client"

import { RetryNotice } from "@/components/app/retry-notice"

export default function RootError({ retry }: { retry: () => void }) {
  return (
    <main className="flex min-h-svh items-center justify-center px-4">
      <div className="w-full max-w-95">
        <RetryNotice retry={retry} />
      </div>
    </main>
  )
}
