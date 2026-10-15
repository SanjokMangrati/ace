"use client"

import { List, ListRow } from "@/components/ui/list"
import { friendlyDate } from "@/lib/format"

export function TeammateMemory({
  name,
  notes,
}: {
  name: string
  notes: { id: string; content: string; updatedAt: Date }[]
}) {
  if (notes.length === 0) {
    return (
      <List>
        <ListRow>
          <p className="text-small text-ink-3">
            Nothing yet. When {name} learns something useful, like how you like
            your reports, it'll show up here.
          </p>
        </ListRow>
      </List>
    )
  }

  return (
    <List>
      {notes.map((note) => (
        <ListRow key={note.id}>
          <p className="min-w-0 flex-1 text-body wrap-break-word whitespace-pre-line text-ink">
            {note.content}
          </p>
          <time
            dateTime={note.updatedAt.toISOString()}
            suppressHydrationWarning
            className="shrink-0 text-caption text-ink-3"
          >
            {friendlyDate(note.updatedAt)}
          </time>
        </ListRow>
      ))}
    </List>
  )
}
