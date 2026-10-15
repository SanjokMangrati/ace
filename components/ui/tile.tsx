import { cva, type VariantProps } from "class-variance-authority"
import type * as React from "react"
import { cn } from "@/lib/utils"

const tileVariants = cva(
  "grid shrink-0 place-items-center text-on-sun [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      color: {
        none: "bg-fill",
        grape: "bg-candy-grape",
        sky: "bg-candy-sky",
        mint: "bg-candy-mint",
        peach: "bg-candy-peach",
        bubblegum: "bg-candy-bubblegum",
        lime: "bg-candy-lime",
        sun: "bg-sun",
      },
      size: {
        default: "size-9.5 rounded-tile",
        xs: "size-6.5 rounded-tile-xs",
      },
    },
    defaultVariants: {
      color: "none",
      size: "default",
    },
  }
)

function Tile({
  className,
  color,
  size,
  ...props
}: Omit<React.ComponentProps<"span">, "color"> &
  VariantProps<typeof tileVariants>) {
  return (
    <span
      data-slot="tile"
      aria-hidden
      className={cn(tileVariants({ color, size }), className)}
      {...props}
    />
  )
}

export { Tile }
