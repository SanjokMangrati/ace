"use client"

import type { ComponentProps, ReactNode } from "react"
import { StickToBottom } from "use-stick-to-bottom"
import { cn } from "@/lib/utils"

type ConversationProps = ComponentProps<typeof StickToBottom>

export const Conversation = ({ className, ...props }: ConversationProps) => (
  <StickToBottom
    className={cn("relative min-h-0 flex-1 overflow-y-hidden", className)}
    initial="instant"
    resize="smooth"
    role="log"
    {...props}
  />
)

type ConversationContentProps = Omit<
  ComponentProps<typeof StickToBottom.Content>,
  "children"
> & { children: ReactNode }

export const ConversationContent = ({
  className,
  children,
  ...props
}: ConversationContentProps) => (
  <StickToBottom.Content className="px-4 py-8 sm:px-6" {...props}>
    <div
      className={cn(
        "mx-auto flex w-full max-w-thread flex-col gap-8",
        className
      )}
    >
      {children}
    </div>
  </StickToBottom.Content>
)
