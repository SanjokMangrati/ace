import { cva, type VariantProps } from "class-variance-authority"
import type * as React from "react"
import { cn } from "@/lib/utils"

const statusVariants = cva(
  "inline-flex h-6.5 shrink-0 items-center gap-1.75 rounded-full pr-2.75 pl-2.5 font-display text-caption leading-none font-medium whitespace-nowrap before:size-1.75 before:shrink-0 before:rounded-full before:bg-current",
  {
    variants: {
      tone: {
        working:
          "bg-working-soft text-working before:animate-breathe",
        "needs-you": "bg-needs-you-soft text-needs-you",
        control: "bg-control-soft text-control",
        waiting:
          "bg-fill text-ink-2 before:bg-transparent before:inset-ring-1.5 before:inset-ring-current",
        danger: "bg-danger-soft text-danger",
      },
    },
  }
)

function Status({
  className,
  tone,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof statusVariants>) {
  return (
    <span
      data-slot="status"
      className={cn(statusVariants({ tone }), className)}
      {...props}
    />
  )
}

const dotVariants = cva("size-2 shrink-0 rounded-full", {
  variants: {
    tone: {
      working: "animate-breathe bg-working",
      "needs-you": "bg-needs-you",
      control: "bg-control",
      danger: "bg-danger",
    },
  },
})

function StatusDot({
  className,
  tone,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof dotVariants>) {
  return (
    <span
      data-slot="status-dot"
      aria-hidden
      className={cn(dotVariants({ tone }), className)}
      {...props}
    />
  )
}

export { Status, StatusDot }
