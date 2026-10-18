"use client"

import type * as React from "react"
import { cn } from "@/lib/utils"

function Composer({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="composer"
      className={cn(
        "flex flex-col gap-2 rounded-lg bg-surface pt-3 pr-3 pb-2.5 pl-4 shadow-card ring-1 ring-line focus-within:ring-2 focus-within:ring-ring",
        className
      )}
      {...props}
    />
  )
}

function ComposerTextarea({
  className,
  onKeyDown,
  ...props
}: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="composer-textarea"
      className={cn(
        "max-h-60 min-h-6.5 w-full resize-none bg-transparent p-0 text-prose text-ink field-sizing-content placeholder:text-ink-3 focus-visible:outline-hidden",
        className
      )}
      onKeyDown={(event) => {
        onKeyDown?.(event)
        if (
          event.key === "Enter" &&
          !event.shiftKey &&
          !event.nativeEvent.isComposing &&
          !event.defaultPrevented
        ) {
          event.preventDefault()
          event.currentTarget.form?.requestSubmit()
        }
      }}
      {...props}
    />
  )
}

function ComposerBar({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="composer-bar"
      className={cn("flex items-center gap-2", className)}
      {...props}
    />
  )
}

function ComposerHint({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="composer-hint"
      className={cn(
        "mr-auto inline-flex items-center gap-1.5 text-caption text-ink-3 [&_svg]:size-4.5",
        className
      )}
      {...props}
    />
  )
}

export { Composer, ComposerBar, ComposerHint, ComposerTextarea }
