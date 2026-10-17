"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { ArrowUpIcon, PlusIcon } from "@phosphor-icons/react/ssr"
import Link from "next/link"
import { useForm, useFormState, useWatch } from "react-hook-form"
import { createChat } from "@/app/(app)/chats/actions"
import { ComposerField } from "@/components/form/composer-field"
import { FormError } from "@/components/form/form-error"
import { PickField } from "@/components/form/pick-field"
import { TeammateAvatar } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Composer, ComposerBar, ComposerHint } from "@/components/ui/composer"
import { Spinner } from "@/components/ui/spinner"
import { Tile } from "@/components/ui/tile"
import { callAction, setActionError } from "@/lib/action-client"
import { nameList } from "@/lib/chat"
import { type NewChatInput, newChatSchema } from "@/lib/chat-schemas"
import type { ChatTeammate } from "./chat-message"
import { setPendingMessage, takePendingMessage } from "./pending-message"

export function NewChatForm({
  chatId,
  defaultBotId,
  teammates,
}: {
  chatId: string
  defaultBotId: string
  teammates: (Omit<ChatTeammate, "connected" | "fullAuto"> & { job: string })[]
}) {
  const form = useForm<NewChatInput>({
    resolver: zodResolver(newChatSchema),
    defaultValues: { id: chatId, botIds: [defaultBotId], message: "" },
  })
  const [botIds, message] = useWatch({
    control: form.control,
    name: ["botIds", "message"],
  })
  const { isSubmitting, isSubmitSuccessful } = useFormState({
    control: form.control,
  })
  const pending = isSubmitting || isSubmitSuccessful
  const picked = teammates.filter((teammate) => botIds.includes(teammate.id))
  const names = nameList(picked.map((teammate) => teammate.name))

  async function onSubmit(values: NewChatInput) {
    setPendingMessage(values.id, values.message)
    const result = await callAction(() => createChat(values))
    if (result.ok) return
    takePendingMessage(values.id)
    setActionError(form, result)
  }

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      noValidate
      className="flex flex-col gap-6"
    >
      <FormError control={form.control} />
      <PickField
        control={form.control}
        name="botIds"
        label="Teammates"
        options={teammates.map((teammate) => ({
          value: teammate.id,
          title: teammate.name,
          description: teammate.job,
          media: (
            <TeammateAvatar
              botId={teammate.id}
              name={teammate.name}
              picture={teammate.picture}
              size="lg"
              aria-hidden
            />
          ),
        }))}
      >
        <Link
          href="/teammates/new"
          className="flex items-center gap-3.5 rounded-md border-1.5 border-dashed border-line-strong p-4 font-display text-button text-ink-2 transition duration-150 ease-out hover:bg-fill hover:text-ink"
        >
          <Tile className="size-12 rounded-avatar">
            <PlusIcon weight="regular" />
          </Tile>
          New teammate
        </Link>
      </PickField>
      <Composer>
        <ComposerField
          control={form.control}
          name="message"
          rows={3}
          placeholder={
            picked.length > 1
              ? "What should the team do? Type @ to pick who starts."
              : picked.length === 1
                ? `What should ${names} do?`
                : "Pick a teammate first"
          }
          aria-label="First message"
        />
        <ComposerBar>
          <ComposerHint>
            {picked.length > 1 && `A group chat with ${names}`}
          </ComposerHint>
          <Button
            type="submit"
            size="sm"
            disabled={pending || picked.length === 0 || !message.trim()}
          >
            {pending ? (
              <Spinner data-icon="inline-start" />
            ) : (
              <ArrowUpIcon weight="duotone" data-icon="inline-start" />
            )}
            Start chat
          </Button>
        </ComposerBar>
      </Composer>
    </form>
  )
}
