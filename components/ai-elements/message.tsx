"use client"

import type { UIMessage } from "ai"
import type { ComponentProps, HTMLAttributes } from "react"
import { memo } from "react"
import { type Components, Streamdown } from "streamdown"
import { textLinkClass } from "@/components/ui/text-link"
import { cn } from "@/lib/utils"

type MessageProps = HTMLAttributes<HTMLDivElement> & {
  from: UIMessage["role"]
}

export const Message = ({ className, from, ...props }: MessageProps) => (
  <div
    className={cn(
      "flex items-start gap-3",
      from === "user" && "justify-end",
      className
    )}
    {...props}
  />
)

type MessageContentProps = HTMLAttributes<HTMLDivElement>

export const MessageContent = ({ className, ...props }: MessageContentProps) => (
  <div
    className={cn("flex min-w-0 flex-1 flex-col gap-2", className)}
    {...props}
  />
)

const proseComponents: Components = {
  p: ({ node: _node, className, ...props }) => (
    <p className={cn("text-prose", className)} {...props} />
  ),
  ul: ({ node: _node, className, ...props }) => (
    <ul
      className={cn("flex list-disc flex-col gap-1 pl-5.5", className)}
      {...props}
    />
  ),
  ol: ({ node: _node, className, ...props }) => (
    <ol
      className={cn("flex list-decimal flex-col gap-1 pl-5.5", className)}
      {...props}
    />
  ),
  li: ({ node: _node, className, ...props }) => (
    <li className={cn("text-prose", className)} {...props} />
  ),
  strong: ({ node: _node, className, ...props }) => (
    <b className={cn("font-semibold", className)} {...props} />
  ),
  a: ({ node: _node, className, ...props }) => (
    <a
      className={cn(textLinkClass, className)}
      target="_blank"
      rel="noreferrer"
      {...props}
    />
  ),
  h1: ({ node: _node, className, ...props }) => (
    <h3 className={cn("font-display text-title", className)} {...props} />
  ),
  h2: ({ node: _node, className, ...props }) => (
    <h3 className={cn("font-display text-title", className)} {...props} />
  ),
  h3: ({ node: _node, className, ...props }) => (
    <h4 className={cn("font-display text-name", className)} {...props} />
  ),
  h4: ({ node: _node, className, ...props }) => (
    <h4 className={cn("font-display text-name", className)} {...props} />
  ),
  blockquote: ({ node: _node, className, ...props }) => (
    <blockquote
      className={cn("border-l-2 border-line-strong pl-4 text-ink-2", className)}
      {...props}
    />
  ),
  code: ({ node: _node, className, ...props }) => (
    <code className={cn("rounded-mark bg-fill px-1", className)} {...props} />
  ),
  pre: ({ node: _node, className, ...props }) => (
    <pre
      className={cn(
        "overflow-x-auto rounded-sm bg-fill px-3 py-2.5 text-small whitespace-pre-wrap text-ink-2 *:bg-transparent *:p-0",
        className
      )}
      {...props}
    />
  ),
  hr: ({ node: _node, className, ...props }) => (
    <hr className={cn("border-line", className)} {...props} />
  ),
  table: ({ node: _node, className, ...props }) => (
    <div className="overflow-x-auto rounded-md shadow-card">
      <table
        className={cn("w-full border-collapse text-body", className)}
        {...props}
      />
    </div>
  ),
  th: ({ node: _node, className, ...props }) => (
    <th
      className={cn(
        "border-b border-line px-3 py-2 text-left text-body-strong",
        className
      )}
      {...props}
    />
  ),
  td: ({ node: _node, className, ...props }) => (
    <td
      className={cn("border-b border-line px-3 py-2 align-top", className)}
      {...props}
    />
  ),
}

type MessageResponseProps = ComponentProps<typeof Streamdown>

export const MessageResponse = memo(
  ({ className, ...props }: MessageResponseProps) => (
    <Streamdown
      className={cn("flex flex-col gap-3 text-prose text-ink", className)}
      components={proseComponents}
      controls={false}
      linkSafety={{ enabled: false }}
      {...props}
    />
  ),
  (prevProps, nextProps) =>
    prevProps.children === nextProps.children &&
    nextProps.isAnimating === prevProps.isAnimating
)

MessageResponse.displayName = "MessageResponse"
