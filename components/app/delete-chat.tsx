"use client"

import { useRef } from "react"
import { deleteChat } from "@/app/(app)/chats/actions"
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { FieldError } from "@/components/ui/field"
import { Spinner } from "@/components/ui/spinner"
import { useAction } from "@/lib/action-client"
import { nameList } from "@/lib/chat"

export function DeleteChatDialog({
  chatId,
  title,
  teammateNames,
  active,
  open,
  onOpenChange,
}: {
  chatId: string
  title: string
  teammateNames: string[]
  active: boolean
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const cancelRef = useRef<HTMLButtonElement>(null)
  const { pending, error, run } = useAction()
  const names = nameList(teammateNames)
  const keeps =
    teammateNames.length > 1
      ? "keep their computers, their files and what they remember"
      : "keeps its computer, its files and what it remembers"

  function confirm() {
    run(
      () => deleteChat(chatId, active),
      () => onOpenChange(false)
    )
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent initialFocus={cancelRef}>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this chat with {names}?</AlertDialogTitle>
          <AlertDialogDescription>
            “{title}” and its messages will be deleted for good. {names} {keeps}
            .
          </AlertDialogDescription>
          {error && <FieldError>{error}</FieldError>}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel ref={cancelRef}>Keep chat</AlertDialogCancel>
          <Button
            type="button"
            variant="danger"
            disabled={pending}
            onClick={confirm}
          >
            {pending && <Spinner data-icon="inline-start" />}
            Delete chat
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
