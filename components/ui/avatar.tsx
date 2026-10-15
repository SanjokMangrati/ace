"use client"

import { Avatar as AvatarPrimitive } from "@base-ui/react/avatar"
import { cva, type VariantProps } from "class-variance-authority"
import type * as React from "react"
import { cn } from "@/lib/utils"

const candyBackgrounds = {
  grape: "bg-candy-grape",
  sky: "bg-candy-sky",
  mint: "bg-candy-mint",
  peach: "bg-candy-peach",
  bubblegum: "bg-candy-bubblegum",
  lime: "bg-candy-lime",
} as const

type CandyColor = keyof typeof candyBackgrounds

const candyColors = Object.keys(candyBackgrounds) as CandyColor[]

function candyFor(name: string): CandyColor {
  let hash = 0
  for (const char of name) hash = (hash * 31 + char.charCodeAt(0)) >>> 0
  return candyColors[hash % candyColors.length]
}

const avatarVariants = cva(
  "group/avatar relative inline-grid shrink-0 place-items-center overflow-hidden font-display text-on-sun select-none",
  {
    variants: {
      kind: {
        teammate: "rounded-avatar",
        you: "rounded-full",
      },
      color: candyBackgrounds,
      size: {
        xs: "size-5.5 text-letter-xs",
        sm: "size-7 text-letter-sm",
        md: "size-9 text-letter-md",
        lg: "size-12 text-letter-lg",
        xl: "size-18 text-letter-xl",
      },
    },
    compoundVariants: [{ kind: "you", className: "bg-ink text-bg" }],
    defaultVariants: {
      kind: "teammate",
      color: "lime",
      size: "md",
    },
  }
)

function Avatar({
  className,
  kind,
  color,
  size,
  ...props
}: AvatarPrimitive.Root.Props & VariantProps<typeof avatarVariants>) {
  return (
    <AvatarPrimitive.Root
      data-slot="avatar"
      className={cn(avatarVariants({ kind, color, size }), className)}
      {...props}
    />
  )
}

function AvatarImage({ className, ...props }: AvatarPrimitive.Image.Props) {
  return (
    <AvatarPrimitive.Image
      data-slot="avatar-image"
      className={cn("size-full object-cover", className)}
      {...props}
    />
  )
}

function AvatarFallback({
  className,
  ...props
}: AvatarPrimitive.Fallback.Props) {
  return (
    <AvatarPrimitive.Fallback
      data-slot="avatar-fallback"
      className={cn("grid size-full place-items-center", className)}
      {...props}
    />
  )
}

function TeammateAvatar({
  botId,
  name,
  picture,
  ...props
}: Omit<
  React.ComponentProps<typeof Avatar>,
  "kind" | "color" | "children"
> & {
  botId: string
  name: string
  picture?: string | null
}) {
  return (
    <Avatar
      kind="teammate"
      color={null}
      role="img"
      aria-label={name}
      {...props}
    >
      <AvatarImage
        key={picture ?? botId}
        src={picture ?? `/api/avatars/${encodeURIComponent(botId)}`}
        alt=""
      />
      <AvatarFallback aria-hidden className={candyBackgrounds[candyFor(name)]}>
        {name.charAt(0).toUpperCase()}
      </AvatarFallback>
    </Avatar>
  )
}

function AvatarGroup({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="avatar-group"
      className={cn(
        "inline-flex *:data-[slot=avatar]:ring-2 *:data-[slot=avatar]:ring-bg *:data-[slot=avatar]:not-first:-ml-2",
        className
      )}
      {...props}
    />
  )
}

export {
  Avatar,
  AvatarImage,
  AvatarFallback,
  AvatarGroup,
  TeammateAvatar,
  candyFor,
}
