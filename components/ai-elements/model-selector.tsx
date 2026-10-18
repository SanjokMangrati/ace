"use client"

import type { ComponentProps, ReactNode } from "react"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { SelectOption } from "@/components/ui/select"
import { cn } from "@/lib/utils"

type ModelSelectorProps = ComponentProps<typeof Popover>

export const ModelSelector = (props: ModelSelectorProps) => (
  <Popover {...props} />
)

type ModelSelectorTriggerProps = ComponentProps<typeof PopoverTrigger>

export const ModelSelectorTrigger = (props: ModelSelectorTriggerProps) => (
  <PopoverTrigger {...props} />
)

type ModelSelectorContentProps = ComponentProps<typeof PopoverContent> & {
  commandProps?: Omit<ComponentProps<typeof Command>, "children">
}

export const ModelSelectorContent = ({
  className,
  children,
  commandProps,
  ...props
}: ModelSelectorContentProps) => (
  <PopoverContent
    collisionAvoidance={{ fallbackAxisSide: "none" }}
    className={cn("w-64", className)}
    {...props}
  >
    <Command {...commandProps}>{children}</Command>
  </PopoverContent>
)

type ModelSelectorInputProps = ComponentProps<typeof CommandInput>

export const ModelSelectorInput = (props: ModelSelectorInputProps) => (
  <CommandInput {...props} />
)

type ModelSelectorListProps = ComponentProps<typeof CommandList>

export const ModelSelectorList = (props: ModelSelectorListProps) => (
  <CommandList {...props} />
)

type ModelSelectorEmptyProps = ComponentProps<typeof CommandEmpty>

export const ModelSelectorEmpty = (props: ModelSelectorEmptyProps) => (
  <CommandEmpty {...props} />
)

type ModelSelectorGroupProps = ComponentProps<typeof CommandGroup>

export const ModelSelectorGroup = (props: ModelSelectorGroupProps) => (
  <CommandGroup {...props} />
)

type ModelSelectorItemProps = ComponentProps<typeof CommandItem> & {
  checked?: boolean
}

export const ModelSelectorItem = ({
  checked,
  ...props
}: ModelSelectorItemProps) => (
  <CommandItem data-checked={checked} aria-checked={checked} {...props} />
)

type ModelSelectorNameProps = ComponentProps<"span"> & {
  detail?: ReactNode
}

export const ModelSelectorName = ({
  className,
  children,
  detail,
  ...props
}: ModelSelectorNameProps) => (
  <span className={cn("flex min-w-0 flex-1 flex-col", className)} {...props}>
    <SelectOption label={children} detail={detail} />
  </span>
)
