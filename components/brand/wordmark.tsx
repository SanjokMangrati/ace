import { cn } from "@/lib/utils"

export function Wordmark({
  size = "default",
  tone = "default",
  className,
  ...props
}: React.ComponentProps<"span"> & {
  size?: "default" | "lg"
  tone?: "default" | "sun"
}) {
  return (
    <span
      className={cn(
        "inline-flex items-baseline gap-px font-display text-wordmark after:size-1.75 after:rounded-full after:bg-sun after:ring-1 after:ring-on-sun",
        size === "lg" && "text-wordmark-lg",
        tone === "sun" && "text-on-sun after:bg-on-sun-mark",
        className
      )}
      {...props}
    >
      Ace
    </span>
  )
}
