"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { type Failure, fail, zodFailure } from "@/lib/action-result"
import { chatTitle } from "@/lib/chat"
import {
  chatIdSchema,
  type NewChatInput,
  newChatSchema,
} from "@/lib/chat-schemas"
import { chatRuntime } from "@/server/container"
import { insertChat, ownsChat } from "@/server/db/queries/chats"
import { requireUser } from "@/server/session"

export async function createChat(
  values: NewChatInput
): Promise<Failure<keyof NewChatInput>> {
  const user = await requireUser()
  const parsed = newChatSchema.safeParse(values)
  if (!parsed.success) return zodFailure(parsed.error)
  const { id, botId, message } = parsed.data

  if (!(await insertChat(user.id, { id, botId, title: chatTitle(message) }))) {
    return fail(
      "We couldn't find this teammate. It may have been deleted.",
      "botId"
    )
  }

  revalidatePath("/", "layout")
  redirect(`/chats/${id}`)
}

async function requireChat(chatId: string) {
  const user = await requireUser()
  const id = chatIdSchema.parse(chatId)
  if (!(await ownsChat(user.id, id))) throw new Error("Chat not found")
  return id
}

export async function startChatSession(chatId: string) {
  return chatRuntime.startSession(await requireChat(chatId))
}

export async function mintChatAccessToken(chatId: string) {
  return chatRuntime.accessToken(await requireChat(chatId))
}
