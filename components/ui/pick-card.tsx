import { CheckIcon } from "@phosphor-icons/react/ssr"
import type * as React from "react"
import { cn } from "@/lib/utils"

function PickCard({
  className,
  pressed,
  media,
  title,
  description,
  ...props
}: Omit<React.ComponentProps<"button">, "title" | "children"> & {
  pressed: boolean
  media?: React.ReactNode
  title: React.ReactNode
  description?: React.ReactNode
}) {
  return (
    <button
      type="button"
      data-slot="pick-card"
      aria-pressed={pressed}
      className={cn(
        "group/pick flex w-full cursor-pointer items-center gap-3.5 rounded-md bg-surface p-4 text-left text-ink shadow-card transition duration-150 ease-out hover:not-aria-pressed:bg-fill aria-pressed:bg-sun-soft aria-pressed:shadow-none aria-pressed:ring-2 aria-pressed:ring-ink",
        className
      )}
      {...props}
    >
      {media}
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="font-display text-name">{title}</span>
        {description && (
          <span className="text-small text-ink-2 group-aria-pressed/pick:text-ink">
            {description}
          </span>
        )}
      </span>
      <span
        aria-hidden
        className="grid size-6 shrink-0 place-items-center rounded-full border-1.5 border-input text-on-sun group-aria-pressed/pick:border-on-sun group-aria-pressed/pick:bg-sun"
      >
        <CheckIcon
          weight="duotone"
          className="size-3.5 opacity-0 group-aria-pressed/pick:opacity-100"
        />
      </span>
    </button>
  )
}

export { PickCard }
