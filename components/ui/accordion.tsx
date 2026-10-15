import { Accordion as AccordionPrimitive } from "@base-ui/react/accordion"
import { CaretDownIcon } from "@phosphor-icons/react/ssr"
import { cn } from "@/lib/utils"

function Accordion({ className, ...props }: AccordionPrimitive.Root.Props) {
  return (
    <AccordionPrimitive.Root
      data-slot="accordion"
      className={cn("flex w-full flex-col", className)}
      {...props}
    />
  )
}

function AccordionItem({ className, ...props }: AccordionPrimitive.Item.Props) {
  return (
    <AccordionPrimitive.Item
      data-slot="accordion-item"
      className={cn("not-last:border-b", className)}
      {...props}
    />
  )
}

function AccordionTrigger({
  className,
  children,
  heading: Heading = "h3",
  ...props
}: AccordionPrimitive.Trigger.Props & { heading?: "h2" | "h3" | "h4" }) {
  return (
    <AccordionPrimitive.Header render={<Heading />} className="flex">
      <AccordionPrimitive.Trigger
        data-slot="accordion-trigger"
        className={cn(
          "group/accordion-trigger flex flex-1 cursor-pointer items-center justify-between gap-4 rounded-sm py-2 text-left text-ink transition-colors duration-150 ease-out aria-disabled:pointer-events-none aria-disabled:opacity-50",
          className
        )}
        {...props}
      >
        {children}
        <CaretDownIcon
          weight="duotone"
          data-slot="accordion-trigger-icon"
          className="pointer-events-none size-5 shrink-0 text-ink-2 transition-transform duration-150 ease-out group-aria-expanded/accordion-trigger:rotate-180"
        />
      </AccordionPrimitive.Trigger>
    </AccordionPrimitive.Header>
  )
}

function AccordionContent({
  className,
  children,
  ...props
}: Omit<AccordionPrimitive.Panel.Props, "className"> & {
  className?: string
}) {
  return (
    <AccordionPrimitive.Panel
      data-slot="accordion-content"
      className="h-(--accordion-panel-height) overflow-hidden transition-all duration-200 ease-out data-ending-style:h-0 data-starting-style:h-0"
      {...props}
    >
      <div className={className}>{children}</div>
    </AccordionPrimitive.Panel>
  )
}

export { Accordion, AccordionContent, AccordionItem, AccordionTrigger }
