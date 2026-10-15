"use client"

import { PlugsConnectedIcon } from "@phosphor-icons/react/ssr"
import { useRef, useState } from "react"
import { removeProviderKey } from "@/app/(app)/providers/actions"
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { FieldError } from "@/components/ui/field"
import { List, ListRow, ListRowText } from "@/components/ui/list"
import { Spinner } from "@/components/ui/spinner"
import { Tile, type TileColor } from "@/components/ui/tile"
import { useAction } from "@/lib/action-client"
import { teammateCount } from "@/lib/format"
import type { Provider } from "@/lib/models"
import type { ProviderKeyOption } from "@/lib/provider-display"

type ProviderKeyRow = ProviderKeyOption & { usedBy: string[] }

const tileColors: Record<Provider, TileColor> = {
  anthropic: "peach",
  openai: "mint",
  google: "sky",
  openai_compatible: "grape",
}

function joinNames(names: string[]) {
  if (names.length <= 1) return names.join("")
  return `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`
}

function RemoveKey({ row }: { row: ProviderKeyRow }) {
  const cancelRef = useRef<HTMLButtonElement>(null)
  const [open, setOpen] = useState(false)
  const { pending, error, run } = useAction()

  function confirm() {
    run(
      () => removeProviderKey(row.id),
      () => setOpen(false)
    )
  }

  const used = row.usedBy.length > 0

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger
        render={<Button type="button" variant="ghost" size="sm" />}
      >
        Remove
      </AlertDialogTrigger>
      <AlertDialogContent initialFocus={cancelRef}>
        <AlertDialogHeader>
          <AlertDialogTitle>Remove your {row.label} key?</AlertDialogTitle>
          <AlertDialogDescription>
            {used
              ? `${joinNames(row.usedBy)} ${row.usedBy.length === 1 ? "uses" : "use"} this key. Until you pick another key in their settings, they can't work.`
              : "Ace deletes the key for good. You can add it again later."}
          </AlertDialogDescription>
          {error && <FieldError>{error}</FieldError>}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel ref={cancelRef}>Keep key</AlertDialogCancel>
          <Button
            type="button"
            variant="danger"
            disabled={pending}
            onClick={confirm}
          >
            {pending && <Spinner data-icon="inline-start" />}
            Remove key
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

export function ProviderKeyList({ rows }: { rows: ProviderKeyRow[] }) {
  return (
    <List>
      {rows.map((row) => (
        <ListRow key={row.id}>
          <Tile color={tileColors[row.provider]}>
            <PlugsConnectedIcon weight="duotone" />
          </Tile>
          <ListRowText
            title={row.label}
            description={`${row.detail} · ${
              row.usedBy.length > 0
                ? `Used by ${teammateCount(row.usedBy.length)}`
                : "Not used yet"
            }`}
          />
          <RemoveKey row={row} />
        </ListRow>
      ))}
    </List>
  )
}
