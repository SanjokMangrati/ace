"use client"

import { Switch as SwitchPrimitive } from "@base-ui/react/switch"
import { cn } from "@/lib/utils"

function Switch({ className, ...props }: SwitchPrimitive.Root.Props) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        "relative inline-flex h-6.5 w-10.5 shrink-0 cursor-pointer rounded-full bg-input transition-colors duration-150 ease-out data-checked:bg-sun data-checked:inset-ring-1.5 data-checked:inset-ring-on-sun data-disabled:cursor-not-allowed data-disabled:opacity-45",
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className="pointer-events-none absolute top-0.75 left-0.75 size-5 rounded-full bg-surface transition-transform duration-180 ease-spring data-checked:translate-x-4 data-checked:bg-on-sun"
      />
    </SwitchPrimitive.Root>
  )
}

export { Switch }
