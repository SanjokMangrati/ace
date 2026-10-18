"use client"

import { Select as SelectPrimitive } from "@base-ui/react/select"
import { CaretDownIcon, CheckIcon } from "@phosphor-icons/react/ssr"
import type * as React from "react"
import { cn } from "@/lib/utils"

const Select = SelectPrimitive.Root

function SelectValue({ className, ...props }: SelectPrimitive.Value.Props) {
  return (
    <SelectPrimitive.Value
      data-slot="select-value"
      className={cn("flex min-w-0 flex-col", className)}
      {...props}
    />
  )
}

function SelectTrigger({
  className,
  children,
  ...props
}: SelectPrimitive.Trigger.Props) {
  return (
    <SelectPrimitive.Trigger
      data-slot="select-trigger"
      className={cn(
        "flex min-h-control w-full min-w-0 cursor-pointer items-center justify-between gap-2.5 rounded-sm border border-input bg-surface px-3 py-1 text-left text-body text-ink transition-colors duration-150 ease-out focus-visible:outline-offset-1 aria-invalid:border-danger data-disabled:cursor-not-allowed data-disabled:opacity-45 data-placeholder:text-ink-3",
        className
      )}
      {...props}
    >
      {children}
      <SelectPrimitive.Icon
        render={
          <CaretDownIcon
            weight="duotone"
            className="pointer-events-none size-4.5 shrink-0"
          />
        }
      />
    </SelectPrimitive.Trigger>
  )
}

function SelectContent({
  className,
  children,
  side = "bottom",
  sideOffset = 6,
  align = "start",
  ...props
}: SelectPrimitive.Popup.Props &
  Pick<SelectPrimitive.Positioner.Props, "align" | "side" | "sideOffset">) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Positioner
        side={side}
        sideOffset={sideOffset}
        align={align}
        alignItemWithTrigger={false}
        className="isolate z-50 outline-hidden"
      >
        <SelectPrimitive.Popup
          data-slot="select-content"
          className={cn(
            "max-h-(--available-height) w-(--anchor-width) origin-(--transform-origin) overflow-x-hidden overflow-y-auto rounded-md bg-surface p-1.5 text-ink shadow-overlay outline-hidden duration-150 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
            className
          )}
          {...props}
        >
          <SelectPrimitive.List>{children}</SelectPrimitive.List>
        </SelectPrimitive.Popup>
      </SelectPrimitive.Positioner>
    </SelectPrimitive.Portal>
  )
}

function SelectGroup({ className, ...props }: SelectPrimitive.Group.Props) {
  return (
    <SelectPrimitive.Group
      data-slot="select-group"
      className={cn("flex flex-col", className)}
      {...props}
    />
  )
}

function SelectItem({
  className,
  children,
  ...props
}: SelectPrimitive.Item.Props) {
  return (
    <SelectPrimitive.Item
      data-slot="select-item"
      className={cn(
        "relative flex min-h-control cursor-pointer items-center gap-2.5 rounded-sm py-2 pr-9.5 pl-2.5 text-body text-ink outline-hidden select-none data-disabled:pointer-events-none data-disabled:opacity-45 data-highlighted:bg-fill",
        className
      )}
      {...props}
    >
      <SelectPrimitive.ItemText className="flex min-w-0 flex-1 flex-col">
        {children}
      </SelectPrimitive.ItemText>
      <SelectPrimitive.ItemIndicator className="pointer-events-none absolute right-2.5 flex items-center">
        <CheckIcon weight="regular" className="size-5" />
      </SelectPrimitive.ItemIndicator>
    </SelectPrimitive.Item>
  )
}

function SelectOption({
  label,
  detail,
}: {
  label: React.ReactNode
  detail?: React.ReactNode
}) {
  return (
    <>
      <span className="truncate text-ink">{label}</span>
      {detail && (
        <small className="truncate text-caption text-ink-3">{detail}</small>
      )}
    </>
  )
}

export {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectOption,
  SelectTrigger,
  SelectValue,
}
