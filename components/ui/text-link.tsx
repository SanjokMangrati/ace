import Link from "next/link"
import { cn } from "@/lib/utils"

function TextLink({ className, ...props }: React.ComponentProps<typeof Link>) {
  return (
    <Link
      data-slot="text-link"
      className={cn(
        "text-ink underline decoration-line-strong underline-offset-3 hover:decoration-current",
        className
      )}
      {...props}
    />
  )
}

export { TextLink }
