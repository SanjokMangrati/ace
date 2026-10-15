import { chat } from "@trigger.dev/sdk/ai"
import { isStepCount } from "ai"
import { TEAMMATE_CHAT_TASK, type TeammateMessage } from "@/lib/chat"
import { providerLabel } from "@/lib/models"
import { createAiGatewayCatalog } from "@/server/adapters/ai-gateway"
import { createAiSdkModels } from "@/server/adapters/ai-sdk"
import { createDaytonaSandboxes } from "@/server/adapters/daytona"
import { createEnvKeyVault } from "@/server/adapters/env-key-vault"
import { postgresTranscriptStorage } from "@/server/adapters/trigger/transcript-storage"
import {
  costUsd,
  DAY_MS,
  endReason,
  type Price,
  type SandboxUse,
  sandboxCostUsd,
  totalUsage,
  turnNotice,
} from "@/server/agent/limits"
import { noteTools } from "@/server/agent/notes"
import { systemPrompt } from "@/server/agent/prompt"
import { sandboxTools } from "@/server/agent/sandbox-tools"
import {
  endRunningTurns,
  findChatContext,
  finishTurn,
  spentSince,
  startTurn,
  type TurnEndReason,
} from "@/server/db/queries/chats"
import { saveSandbox } from "@/server/db/queries/sandboxes"
import { env } from "@/server/env"
import type { Sandbox } from "@/server/ports/sandbox"

const models = createAiSdkModels()
const keyVault = createEnvKeyVault(env.ENCRYPTION_KEY)
const modelCatalog = createAiGatewayCatalog()
const sandboxes = createDaytonaSandboxes(env.DAYTONA_SNAPSHOT)

type Turn = {
  id: string
  botId: string
  price: Price | undefined
  maxSteps: number
  taskBudgetUsd: number
  dailyBudgetUsd: number
  failure: string
  steps: {
    finishReason: string
    usage: { inputTokens?: number; outputTokens?: number }
  }[]
  failed: boolean
  reason?: TurnEndReason
  sandbox?: Promise<Sandbox>
  sandboxUse?: SandboxUse
}

const turn = chat.local<{ current: Turn | null }>({ id: "turn" })

function turnCostUsd(current: Turn, steps: Turn["steps"]) {
  return (
    costUsd(current.price, totalUsage(steps)) +
    sandboxCostUsd(current.sandboxUse, Date.now())
  )
}

function openSandbox() {
  const current = turn.current
  if (!current) throw new Error("No turn is running.")
  current.sandbox ??= (async () => {
    const since = Date.now()
    const sandbox = await sandboxes.open(current.botId)
    current.sandboxUse = { since, usdPerHour: sandbox.usdPerHour }
    await saveSandbox({
      botId: current.botId,
      provider: sandboxes.name,
      providerRef: sandbox.ref,
    })
    return sandbox
  })().catch((error) => {
    current.sandbox = undefined
    throw error
  })
  return current.sandbox
}

export const teammateChat = chat
  .withUIMessage<TeammateMessage>({
    streamOptions: {
      sendReasoning: true,
      messageMetadata: ({ part }) => {
        if (part.type === "start") return { createdAt: Date.now() }
        if (part.type === "finish") return { finishedAt: Date.now() }
      },
    },
  })
  .agent({
    id: TEAMMATE_CHAT_TASK,
    storage: postgresTranscriptStorage,
    tools: ({ chatId }) => ({
      ...noteTools(chatId),
      ...sandboxTools(openSandbox),
    }),
    onBoot: () => {
      turn.init({ current: null })
    },
    onFailure: ({ payload }) => endRunningTurns(payload.chatId),
    run: async ({ chatId, messages, tools, signal, streamText }) => {
      const bot = await findChatContext(chatId)
      if (!bot) throw new Error("This chat no longer exists.")
      const key = bot.providerKey
      if (!key) {
        throw new Error(
          `${bot.name} isn't connected to an AI provider yet. Pick one in ${bot.name}'s settings, then send your message again.`
        )
      }

      const current: Turn = {
        id: await startTurn(chatId, bot.id),
        botId: bot.id,
        price: await modelCatalog.find(key.provider, bot.modelId),
        maxSteps: bot.maxSteps,
        taskBudgetUsd: bot.taskBudgetUsd,
        dailyBudgetUsd: bot.dailyBudgetUsd,
        failure: `${bot.name} couldn't reach ${providerLabel(key.provider)}. Send your message again in a moment.`,
        steps: [],
        failed: false,
      }
      turn.current = current

      const spent = await spentSince(bot.id, new Date(Date.now() - DAY_MS))
      if (spent >= bot.dailyBudgetUsd) {
        current.reason = "daily_budget"
        return
      }

      chat.setUIMessageStreamOptions({ onError: () => current.failure })
      return streamText({
        model: models.languageModel(
          {
            provider: key.provider,
            baseUrl: key.baseUrl,
            apiKey: key.sealedKey ? keyVault.open(key.sealedKey) : undefined,
          },
          bot.modelId
        ),
        system: systemPrompt(bot),
        messages,
        tools,
        abortSignal: signal,
        stopWhen: [
          isStepCount(bot.maxSteps),
          ({ steps }) => turnCostUsd(current, steps) >= bot.taskBudgetUsd,
        ],
        onStepFinish: (step) => {
          current.steps.push(step)
        },
        onError: () => {
          current.failed = true
        },
      })
    },
    onBeforeTurnComplete: async ({ writer, stopped }) => {
      const current = turn.current
      if (!current) return
      turn.current = null

      const usage = totalUsage(current.steps)
      const cost = turnCostUsd(current, current.steps)
      const reason =
        current.reason ??
        endReason({
          stopped,
          failed: current.failed,
          steps: current.steps,
          maxSteps: current.maxSteps,
          costUsd: cost,
          taskBudgetUsd: current.taskBudgetUsd,
        })
      const notice = turnNotice(reason, {
        ...current,
        steps: current.steps.length,
      })
      if (notice) writer.write({ type: "data-notice", data: notice })

      await finishTurn(current.id, {
        endReason: reason,
        stepCount: current.steps.length,
        ...usage,
        costUsd: cost,
      })
    },
  })
