import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonStyles = cva(
  "group/button inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-full border border-transparent font-display text-button whitespace-nowrap transition duration-150 ease-out select-none disabled:cursor-not-allowed disabled:opacity-45 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-5",
  {
    variants: {
      variant: {
        primary:
          "border-on-sun bg-primary text-on-primary shadow-pop not-disabled:hover:-translate-y-px not-disabled:hover:bg-primary-hover not-disabled:active:translate-y-px not-disabled:active:shadow-none",
        secondary:
          "border-line-strong bg-surface text-ink not-disabled:hover:bg-fill",
        ghost:
          "bg-transparent text-ink-2 not-disabled:hover:bg-fill not-disabled:hover:text-ink",
        danger:
          "bg-danger text-on-danger not-disabled:hover:brightness-94",
        "danger-quiet":
          "border-line-strong bg-surface text-danger not-disabled:hover:bg-danger-soft",
      },
      size: {
        default: "h-control px-4.5",
        sm: "h-control-sm px-3.5 text-small [&_svg:not([class*='size-'])]:size-4.5",
        icon: "size-control",
        "icon-sm":
          "size-control-sm [&_svg:not([class*='size-'])]:size-4.5",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  }
)

function buttonVariants(props?: Parameters<typeof buttonStyles>[0]) {
  return cn(buttonStyles(props))
}

function Button({
  className,
  variant = "primary",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonStyles>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={buttonVariants({ variant, size, className })}
      {...props}
    />
  )
}

export { Button, buttonVariants }
