import type * as React from "react"
import { cn } from "@/lib/utils"

export function Page({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "mx-auto flex w-full max-w-190 flex-col gap-8 px-4 pt-12 pb-16 sm:px-6",
        className
      )}
      {...props}
    />
  )
}

export function PageHeader({
  title,
  description,
  action,
}: {
  title: React.ReactNode
  description?: React.ReactNode
  action?: React.ReactNode
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-display text-title-lg">{title}</h1>
        {description && (
          <p className="mt-1.5 max-w-intro text-ink-2">{description}</p>
        )}
      </div>
      {action}
    </div>
  )
}

export function Section({
  id,
  title,
  hideTitle,
  heading: Heading = "h2",
  children,
}: {
  id: string
  title: React.ReactNode
  hideTitle?: boolean
  heading?: "h2" | "h3"
  children: React.ReactNode
}) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-3.5">
      <Heading
        id={id}
        className={hideTitle ? "sr-only" : "font-display text-title"}
      >
        {title}
      </Heading>
      {children}
    </section>
  )
}
