import { cva, type VariantProps } from "class-variance-authority"
import type * as React from "react"
import { cn } from "@/lib/utils"

const alertVariants = cva(
  "group/alert grid w-full gap-x-3 rounded-md px-4 py-3 text-left text-body text-ink-2 has-[>svg]:grid-cols-[auto_1fr] *:[svg]:row-span-3 *:[svg]:mt-px *:[svg:not([class*='size-'])]:size-5",
  {
    variants: {
      variant: {
        default: "bg-fill *:[svg]:text-ink",
        "needs-you": "bg-needs-you-soft *:[svg]:text-needs-you",
        danger: "bg-danger-soft *:[svg]:text-danger",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Alert({
  className,
  variant,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof alertVariants>) {
  return (
    <div
      data-slot="alert"
      role="alert"
      className={cn(alertVariants({ variant }), className)}
      {...props}
    />
  )
}

function AlertTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-title"
      className={cn(
        "text-body-strong text-ink group-has-[>svg]/alert:col-start-2",
        className
      )}
      {...props}
    />
  )
}

function AlertDescription({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-description"
      className={cn(
        "text-pretty [&_a]:text-ink [&_a]:underline [&_a]:decoration-line-strong [&_a]:underline-offset-3 [&_a:hover]:decoration-current [&_b]:font-medium [&_b]:text-ink",
        className
      )}
      {...props}
    />
  )
}

function AlertAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-action"
      className={cn("mt-2 flex flex-wrap gap-2", className)}
      {...props}
    />
  )
}

export { Alert, AlertTitle, AlertDescription, AlertAction }
