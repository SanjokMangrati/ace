"use client"

import { CheckIcon, MagnifyingGlassIcon } from "@phosphor-icons/react/ssr"
import { Command as CommandPrimitive } from "cmdk"
import type * as React from "react"
import { cn } from "@/lib/utils"

function Command({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive>) {
  return (
    <CommandPrimitive
      data-slot="command"
      className={cn(
        "flex min-h-0 w-full flex-1 flex-col overflow-hidden bg-surface text-ink",
        className
      )}
      {...props}
    />
  )
}

function CommandInput({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Input>) {
  return (
    <div
      data-slot="command-input-wrapper"
      className="flex shrink-0 items-center gap-2.5 border-b border-line px-3"
    >
      <MagnifyingGlassIcon weight="duotone" className="size-5 text-ink-3" />
      <CommandPrimitive.Input
        data-slot="command-input"
        className={cn(
          "h-10 w-full min-w-0 bg-transparent text-body text-ink placeholder:text-ink-3 focus-visible:outline-hidden disabled:cursor-not-allowed disabled:opacity-45",
          className
        )}
        {...props}
      />
    </div>
  )
}

function CommandList({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.List>) {
  return (
    <CommandPrimitive.List
      data-slot="command-list"
      className={cn(
        "min-h-0 flex-1 scroll-py-1.5 overflow-x-hidden max-h-64 overflow-y-auto p-1.5 outline-hidden",
        className
      )}
      {...props}
    />
  )
}

function CommandEmpty({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Empty>) {
  return (
    <CommandPrimitive.Empty
      data-slot="command-empty"
      className={cn("px-2.5 py-6 text-center text-small text-ink-2", className)}
      {...props}
    />
  )
}

function CommandGroup({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Group>) {
  return (
    <CommandPrimitive.Group
      data-slot="command-group"
      className={cn(
        "py-1 **:[[cmdk-group-heading]]:px-2.5 **:[[cmdk-group-heading]]:py-1.5 **:[[cmdk-group-heading]]:text-small **:[[cmdk-group-heading]]:text-ink-3",
        className
      )}
      {...props}
    />
  )
}

function CommandItem({
  className,
  children,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Item>) {
  return (
    <CommandPrimitive.Item
      data-slot="command-item"
      className={cn(
        "group/command-item relative flex min-h-control cursor-pointer items-center gap-2.5 rounded-sm py-2 pr-9.5 pl-2.5 text-body text-ink outline-hidden select-none data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-45 data-[selected=true]:bg-fill",
        className
      )}
      {...props}
    >
      {children}
      <CheckIcon
        weight="regular"
        className="pointer-events-none absolute right-2.5 size-5 opacity-0 group-data-[checked=true]/command-item:opacity-100"
      />
    </CommandPrimitive.Item>
  )
}

export {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
}
