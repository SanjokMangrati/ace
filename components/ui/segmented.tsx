"use client"

import { Radio as RadioPrimitive } from "@base-ui/react/radio"
import { RadioGroup as RadioGroupPrimitive } from "@base-ui/react/radio-group"
import { cn } from "@/lib/utils"

function SegmentedGroup({ className, ...props }: RadioGroupPrimitive.Props) {
  return (
    <RadioGroupPrimitive
      data-slot="segmented-group"
      className={cn("flex flex-wrap gap-2", className)}
      {...props}
    />
  )
}

function SegmentedItem({ className, ...props }: RadioPrimitive.Root.Props) {
  return (
    <RadioPrimitive.Root
      data-slot="segmented-item"
      className={cn(
        "inline-flex h-control cursor-pointer items-center rounded-full border border-line-strong bg-surface px-4 font-display text-button text-ink transition-colors duration-150 ease-out select-none hover:bg-fill data-checked:border-ink data-checked:bg-sun-soft data-checked:inset-ring-1 data-checked:inset-ring-ink data-disabled:cursor-not-allowed data-disabled:opacity-45",
        className
      )}
      {...props}
    />
  )
}

export { SegmentedGroup, SegmentedItem }
