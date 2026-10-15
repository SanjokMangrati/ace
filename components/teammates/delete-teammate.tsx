"use client"

import { TrashIcon } from "@phosphor-icons/react/ssr"
import { useRef, useState, useTransition } from "react"
import { deleteTeammate } from "@/app/(app)/teammates/actions"
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
import { TeammateAvatar } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { FieldError } from "@/components/ui/field"
import { List, ListRow, ListRowText } from "@/components/ui/list"
import { Spinner } from "@/components/ui/spinner"

export function DeleteTeammate({
  botId,
  name,
  picture,
}: {
  botId: string
  name: string
  picture: string | null
}) {
  const cancelRef = useRef<HTMLButtonElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function confirm() {
    setError(null)
    startTransition(async () => {
      const result = await deleteTeammate(botId)
      if (result && !result.ok) setError(result.message)
    })
  }

  return (
    <List>
      <ListRow className="flex-wrap">
        <ListRowText
          title={`Delete ${name}`}
          description="Its computer, its files and what it remembers are deleted for good."
        />
        <AlertDialog>
          <AlertDialogTrigger
            render={<Button type="button" variant="danger-quiet" size="sm" />}
          >
            <TrashIcon weight="duotone" data-icon="inline-start" />
            Delete
          </AlertDialogTrigger>
          <AlertDialogContent initialFocus={cancelRef}>
            <AlertDialogHeader>
              <TeammateAvatar
                botId={botId}
                name={name}
                picture={picture}
                size="lg"
                className="mb-2"
              />
              <AlertDialogTitle>Delete {name}?</AlertDialogTitle>
              <AlertDialogDescription>
                {name}'s computer, the files on it and what it remembers will be
                deleted for good. This can't be undone.
              </AlertDialogDescription>
              {error && <FieldError>{error}</FieldError>}
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel ref={cancelRef}>Keep {name}</AlertDialogCancel>
              <Button
                type="button"
                variant="danger"
                disabled={pending}
                onClick={confirm}
              >
                {pending && <Spinner data-icon="inline-start" />}
                Delete {name}
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </ListRow>
    </List>
  )
}
