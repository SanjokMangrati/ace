export const AUTH_TITLE_ID = "auth-title"

export function AuthHeader({
  title,
  description,
}: {
  title: string
  description: string
}) {
  return (
    <div>
      <h1 id={AUTH_TITLE_ID} className="font-display text-title-lg">
        {title}
      </h1>
      <p className="mt-1.5 text-ink-2">{description}</p>
    </div>
  )
}
