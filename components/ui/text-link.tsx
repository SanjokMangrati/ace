import Link from "next/link"
import { cn } from "@/lib/utils"

const textLinkClass =
  "text-ink underline decoration-line-strong underline-offset-3 hover:decoration-current"

function TextLink({ className, ...props }: React.ComponentProps<typeof Link>) {
  return (
    <Link
      data-slot="text-link"
      className={cn(textLinkClass, className)}
      {...props}
    />
  )
}

export { TextLink, textLinkClass }
