import { CircleNotchIcon } from "@phosphor-icons/react/ssr"
import { cn } from "@/lib/utils"

function Spinner({
  className,
  ...props
}: React.ComponentProps<typeof CircleNotchIcon>) {
  return (
    <CircleNotchIcon
      weight="duotone"
      data-slot="spinner"
      role="status"
      aria-label="Loading"
      className={cn("size-5 animate-spin", className)}
      {...props}
    />
  )
}

export { Spinner }
