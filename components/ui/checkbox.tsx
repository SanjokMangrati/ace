"use client"

import { Checkbox as CheckboxPrimitive } from "@base-ui/react/checkbox"
import { CheckIcon } from "@phosphor-icons/react/ssr"
import { cn } from "@/lib/utils"

function Checkbox({ className, ...props }: CheckboxPrimitive.Root.Props) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        "grid size-5.5 shrink-0 cursor-pointer place-items-center rounded-check border-1.5 border-input bg-surface text-on-sun data-checked:border-on-sun data-checked:bg-sun data-disabled:cursor-not-allowed data-disabled:opacity-45",
        className
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator data-slot="checkbox-indicator">
        <CheckIcon weight="duotone" className="size-3.5" />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )
}

export { Checkbox }
