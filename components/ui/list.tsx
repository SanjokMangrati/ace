import type * as React from "react"
import { cn } from "@/lib/utils"

function List({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="list"
      className={cn(
        "flex flex-col rounded-md bg-surface shadow-card *:not-first:border-t *:not-first:border-line",
        className
      )}
      {...props}
    />
  )
}

function ListRow({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="list-row"
      className={cn("flex items-center gap-3.5 px-4.5 py-3.5", className)}
      {...props}
    />
  )
}

function ListRowText({
  className,
  title,
  description,
  ...props
}: Omit<React.ComponentProps<"span">, "title"> & {
  title: React.ReactNode
  description?: React.ReactNode
}) {
  return (
    <span
      data-slot="list-row-text"
      className={cn("flex min-w-0 flex-1 flex-col", className)}
      {...props}
    >
      <span className="text-body-strong text-ink">{title}</span>
      {description && (
        <span className="text-small text-ink-3">{description}</span>
      )}
    </span>
  )
}

export { List, ListRow, ListRowText }
