import type * as React from "react"
import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "min-h-28 w-full min-w-0 resize-y rounded-sm border border-input bg-surface px-3 py-2.5 text-body leading-6 text-ink transition-colors duration-150 ease-out placeholder:text-ink-3 focus-visible:outline-offset-1 disabled:cursor-not-allowed disabled:opacity-45 aria-invalid:border-danger",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
