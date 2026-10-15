"use client"

import { Dialog as SheetPrimitive } from "@base-ui/react/dialog"
import { cn } from "@/lib/utils"

function Sheet({ ...props }: SheetPrimitive.Root.Props) {
  return <SheetPrimitive.Root data-slot="sheet" {...props} />
}

function SheetTrigger({ ...props }: SheetPrimitive.Trigger.Props) {
  return <SheetPrimitive.Trigger data-slot="sheet-trigger" {...props} />
}

function SheetClose({ ...props }: SheetPrimitive.Close.Props) {
  return <SheetPrimitive.Close data-slot="sheet-close" {...props} />
}

function SheetContent({ className, ...props }: SheetPrimitive.Popup.Props) {
  return (
    <SheetPrimitive.Portal>
      <SheetPrimitive.Backdrop
        data-slot="sheet-overlay"
        className="fixed inset-0 z-50 bg-scrim transition-opacity duration-150 ease-out data-ending-style:opacity-0 data-starting-style:opacity-0"
      />
      <SheetPrimitive.Popup
        data-slot="sheet-content"
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex max-w-full shadow-overlay outline-hidden transition-transform duration-200 ease-out data-ending-style:-translate-x-full data-starting-style:-translate-x-full",
          className
        )}
        {...props}
      />
    </SheetPrimitive.Portal>
  )
}

function SheetTitle({ className, ...props }: SheetPrimitive.Title.Props) {
  return (
    <SheetPrimitive.Title
      data-slot="sheet-title"
      className={cn("font-display text-title text-ink", className)}
      {...props}
    />
  )
}

export { Sheet, SheetClose, SheetContent, SheetTitle, SheetTrigger }
