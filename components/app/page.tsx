"use client"

import type * as React from "react"
import { useEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"

export function Page({
  width = "max-w-190",
  title,
  header,
  children,
}: {
  width?: string
  title?: React.ReactNode
  header?: React.ReactNode
  children: React.ReactNode
}) {
  const barRef = useRef<HTMLDivElement>(null)
  const headerRef = useRef<HTMLDivElement>(null)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const bar = barRef.current
    const target = headerRef.current
    if (!bar || !target) return
    const observer = new IntersectionObserver(
      ([entry]) => setScrolled(!entry.isIntersecting),
      {
        root: bar.parentElement,
        rootMargin: `-${bar.offsetHeight}px 0px 0px 0px`,
      }
    )
    observer.observe(target)
    return () => observer.disconnect()
  }, [])

  return (
    <>
      {title && (
        <div
          ref={barRef}
          data-scrolled={scrolled || undefined}
          className="group/bar sticky top-0 z-10 border-b border-transparent bg-bg transition duration-150 ease-out data-scrolled:border-line"
        >
          <div
            className={cn(
              "mx-auto flex h-14 w-full items-center gap-3 px-4 sm:px-6",
              width
            )}
          >
            <p
              aria-hidden
              className="min-w-0 flex-1 truncate font-display text-title opacity-0 transition duration-150 ease-out group-data-scrolled/bar:opacity-100"
            >
              {title}
            </p>
          </div>
        </div>
      )}
      <div
        className={cn(
          "mx-auto flex w-full flex-col gap-6 px-4 pb-16 sm:px-6",
          title ? "pt-2" : "pt-8",
          width
        )}
      >
        {header && <div ref={headerRef}>{header}</div>}
        {children}
      </div>
    </>
  )
}

export function PageHeader({
  title,
  description,
  action,
}: {
  title: React.ReactNode
  description?: React.ReactNode
  action?: React.ReactNode
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-display text-title-lg">{title}</h1>
        {description && (
          <p className="mt-1.5 max-w-intro text-ink-2">{description}</p>
        )}
      </div>
      {action}
    </div>
  )
}

export function Section({
  id,
  title,
  hideTitle,
  heading: Heading = "h2",
  children,
}: {
  id: string
  title: React.ReactNode
  hideTitle?: boolean
  heading?: "h2" | "h3"
  children: React.ReactNode
}) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-3.5">
      <Heading
        id={id}
        className={hideTitle ? "sr-only" : "font-display text-title"}
      >
        {title}
      </Heading>
      {children}
    </section>
  )
}
