import { TeammateFaces } from "@/components/brand/teammate-faces"
import { Wordmark } from "@/components/brand/wordmark"

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-svh flex-wrap bg-bg text-ink">
      <section
        aria-label="About Ace"
        className="flex min-w-0 grow basis-120 flex-col justify-between gap-8 overflow-hidden bg-sun px-12 py-10 text-on-sun"
      >
        <Wordmark size="lg" tone="sun" className="self-start" />
        <TeammateFaces className="w-full max-w-130 self-center" />
        <p className="max-w-tagline font-display text-hero text-balance">
          Teammates that do the work. You stay in the loop.
        </p>
      </section>
      <section className="flex min-w-0 grow basis-120 items-center justify-center px-6 py-12">
        <div className="w-full max-w-95">{children}</div>
      </section>
    </div>
  )
}
