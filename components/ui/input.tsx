import { Input as InputPrimitive } from "@base-ui/react/input"
import type * as React from "react"
import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        "h-control w-full min-w-0 rounded-sm border border-input bg-surface px-3 text-body text-ink transition-colors duration-150 ease-out placeholder:text-ink-3 focus-visible:outline-offset-1 disabled:cursor-not-allowed disabled:opacity-45 aria-invalid:border-danger",
        className
      )}
      {...props}
    />
  )
}

export { Input }
