import { chat } from "@trigger.dev/sdk/ai"
import { isStepCount, type ModelMessage } from "ai"
import { TEAMMATE_CHAT_TASK, type TeammateMessage } from "@/lib/chat"
import { providerLabel } from "@/lib/models"
import { createAiGatewayCatalog } from "@/server/adapters/ai-gateway"
import { createAiSdkModels } from "@/server/adapters/ai-sdk"
import { createDaytonaSandboxes } from "@/server/adapters/daytona"
import { createEnvKeyVault } from "@/server/adapters/env-key-vault"
import { postgresTranscriptStorage } from "@/server/adapters/trigger/transcript-storage"
import { triggerTurnRuntime } from "@/server/adapters/trigger/turn-runtime"
import {
  computerExecutor,
  computerModelOutput,
  computerTool,
  type HandBack,
  KEPT_SCREENSHOTS,
  pruneScreenshots,
  withHandBacks,
} from "@/server/agent/computer"
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
import {
  endTakeover,
  findTakeover,
  saveSandbox,
} from "@/server/db/queries/sandboxes"
import { loadScreenshot, saveScreenshot } from "@/server/db/queries/screenshots"
import { env } from "@/server/env"
import type { ComputerHandlers } from "@/server/ports/computer"
import type { Sandbox } from "@/server/ports/sandbox"
import {
  LEASE_TTL_MS,
  releaseTurnLease,
  type SandboxLease,
  sandboxLease,
  TAKEOVER_TIMEOUT_SEC,
} from "@/server/sandbox/lease"

const models = createAiSdkModels()
const keyVault = createEnvKeyVault(env.ENCRYPTION_KEY)
const modelCatalog = createAiGatewayCatalog()
const sandboxes = createDaytonaSandboxes(env.DAYTONA_SNAPSHOT)
const runtime = triggerTurnRuntime

const HANDED_BACK =
  "The person took control of your screen and has now given it back. They may have changed what's on it, so look at the screen again before you go on."

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
  computer?: ComputerHandlers
  lease: SandboxLease
}

const turn = chat.local<{ current: Turn | null }>({ id: "turn" })

function currentTurn() {
  const current = turn.current
  if (!current) throw new Error("No turn is running.")
  return current
}

function turnCostUsd(current: Turn, steps: Turn["steps"]) {
  return (
    costUsd(current.price, totalUsage(steps)) +
    sandboxCostUsd(current.sandboxUse, Date.now())
  )
}

function openSandbox() {
  const current = currentTurn()
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

async function waitForTakeover(current: Turn) {
  const takeover = await findTakeover(current.botId)
  if (!takeover) return false
  const tookAt = (takeover.since ?? new Date()).getTime()
  runtime.write({
    type: "data-control",
    id: takeover.waitRef,
    data: { tookAt },
  })
  await current.lease.park(
    new Date(tookAt + TAKEOVER_TIMEOUT_SEC * 1000 + LEASE_TTL_MS)
  )
  await runtime.waitFor(takeover.waitRef)
  await endTakeover(current.botId, takeover.waitRef)
  await current.lease.unpark()
  runtime.write({
    type: "data-control",
    id: takeover.waitRef,
    data: { tookAt, gaveAt: Date.now() },
  })
  return true
}

const historyComputer: ComputerHandlers = {
  execute: (action) => {
    const computer = currentTurn().computer
    if (!computer) throw new Error("You can't use the screen right now.")
    return computer.execute(action)
  },
  toModelOutput: (output) => computerModelOutput(output, loadScreenshot),
}

async function handBackMessage(
  computer: ComputerHandlers | undefined
): Promise<ModelMessage> {
  if (!computer) return { role: "user", content: HANDED_BACK }
  const output = await computer.toModelOutput(
    await computer.execute({ type: "screenshot" })
  )
  const screen = output.type === "content" ? output.value : []
  return {
    role: "user",
    content: [
      { type: "text", text: HANDED_BACK },
      ...screen.filter((part) => part.type === "file"),
    ],
  }
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
      computer: computerTool(historyComputer),
    }),
    onBoot: () => {
      turn.init({ current: null })
    },
    onFailure: async ({ payload }) => {
      const ended = await endRunningTurns(payload.chatId)
      await Promise.all(
        ended.map((row) => releaseTurnLease(runtime, row.botId, row.id))
      )
    },
    run: async ({ chatId, messages, tools, signal, streamText }) => {
      const bot = await findChatContext(chatId)
      if (!bot) throw new Error("This chat no longer exists.")
      const key = bot.providerKey
      if (!key) {
        throw new Error(
          `${bot.name} isn't connected to an AI provider yet. Pick one in ${bot.name}'s settings, then send your message again.`
        )
      }

      const model = await modelCatalog.find(key.provider, bot.modelId)
      const canSeeScreen = model?.vision ?? false
      const turnId = await startTurn(chatId, bot.id)
      const queueId = `queue-${turnId}`
      const current: Turn = {
        id: turnId,
        botId: bot.id,
        price: model,
        maxSteps: bot.maxSteps,
        taskBudgetUsd: bot.taskBudgetUsd,
        dailyBudgetUsd: bot.dailyBudgetUsd,
        failure: `${bot.name} couldn't reach ${providerLabel(key.provider)}. Send your message again in a moment.`,
        steps: [],
        failed: false,
        lease: sandboxLease({
          botId: bot.id,
          turnId,
          runtime,
          onQueued: (holder) =>
            runtime.write({ type: "data-queue", id: queueId, data: holder }),
          onStarted: (waitedFor) =>
            runtime.write({
              type: "data-queue",
              id: queueId,
              data: { ...waitedFor, startedAt: Date.now() },
            }),
        }),
      }
      turn.current = current

      const spent = await spentSince(bot.id, new Date(Date.now() - DAY_MS))
      if (spent >= bot.dailyBudgetUsd) {
        current.reason = "daily_budget"
        return
      }

      const { computer: genericComputer, ...withoutScreen } = tools
      if (canSeeScreen) {
        const execute = computerExecutor({
          desktop: async () => (await openSandbox()).desktop(),
          saveScreenshot: (data) => saveScreenshot(chatId, data),
          waitForControl: async () =>
            (await waitForTakeover(current)) ? HANDED_BACK : null,
        })
        current.computer = {
          execute,
          toModelOutput: historyComputer.toModelOutput,
        }
      }
      const screenTools = current.computer && {
        computer:
          models.nativeComputerTool(
            key.provider,
            bot.modelId,
            current.computer
          ) ?? genericComputer,
      }

      const handBacks: HandBack[] = []
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
        system: systemPrompt({ ...bot, canSeeScreen }),
        messages,
        tools: { ...withoutScreen, ...screenTools },
        abortSignal: signal,
        stopWhen: [
          isStepCount(bot.maxSteps),
          ({ steps }) => turnCostUsd(current, steps) >= bot.taskBudgetUsd,
        ],
        prepareStep: async ({ initialMessages, responseMessages }) => {
          await current.lease.ensure()
          if (await waitForTakeover(current)) {
            handBacks.push({
              after: responseMessages.length,
              message: await handBackMessage(current.computer),
            })
          }
          return {
            messages: pruneScreenshots(
              [
                ...initialMessages,
                ...withHandBacks(responseMessages, handBacks),
              ],
              canSeeScreen ? KEPT_SCREENSHOTS : 0
            ),
          }
        },
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
      await current.lease.release()
    },
  })
