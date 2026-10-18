import { chat } from "@trigger.dev/sdk/ai"
import { convertToModelMessages, type ModelMessage, type ToolSet } from "ai"
import { cappedLimits } from "@/lib/bot-schemas"
import {
  type HandoffEvent,
  handoffMessage,
  nextTeammate,
  TEAMMATE_CHAT_TASK,
  type TeammateMessage,
} from "@/lib/chat"
import { DAY_MS } from "@/lib/format"
import { type CatalogModel, type Provider, providerLabel } from "@/lib/models"
import { createAiGatewayCatalog } from "@/server/adapters/ai-gateway"
import { createAiSdkModels } from "@/server/adapters/ai-sdk"
import { createDaytonaSandboxes } from "@/server/adapters/daytona"
import { createEnvKeyVault } from "@/server/adapters/env-key-vault"
import { createOtelTelemetry } from "@/server/adapters/otel"
import { createPinoLogger } from "@/server/adapters/pino"
import { createPostgresBlobStore } from "@/server/adapters/postgres-blob"
import { postgresTranscriptStorage } from "@/server/adapters/trigger/transcript-storage"
import { triggerTurnRuntime } from "@/server/adapters/trigger/turn-runtime"
import { approvalAnswers, approvalGate } from "@/server/agent/approvals"
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
  HandoffRejected,
  handoffRejection,
  handoffTools,
} from "@/server/agent/handoff"
import { interruptedNote, withLedger } from "@/server/agent/ledger"
import {
  costUsd,
  endReason,
  type Price,
  type SandboxUse,
  sandboxCostUsd,
  totalUsage,
  turnNotice,
} from "@/server/agent/limits"
import { noteTools } from "@/server/agent/notes"
import { systemPrompt } from "@/server/agent/prompt"
import { judgeModelFor, judgeRisk, type ToolRisk } from "@/server/agent/risk"
import { sandboxTools } from "@/server/agent/sandbox-tools"
import {
  type TeamBot,
  teamNames,
  teamPrompt,
  teamView,
} from "@/server/agent/team"
import { webTools } from "@/server/agent/web-tools"
import {
  endRunningTurns,
  findChatTeam,
  findTeammate,
  finishTurn,
  insertHandoff,
  listHops,
  pauseTurn,
  resumeTurn,
  spentSince,
  startTurn,
  type TurnEndReason,
  type TurnTotals,
} from "@/server/db/queries/chats"
import {
  endTakeover,
  findTakeover,
  saveSandbox,
} from "@/server/db/queries/sandboxes"
import { loadScreenshot, saveScreenshot } from "@/server/db/queries/screenshots"
import { askApproval, toolCallLedger } from "@/server/db/queries/tool-calls"
import { env, teammateCaps } from "@/server/env"
import type { ComputerHandlers } from "@/server/ports/computer"
import type { Logger } from "@/server/ports/logger"
import type { Sandbox } from "@/server/ports/sandbox"
import {
  ANSWER_TIMEOUT_SEC,
  LEASE_TTL_MS,
  releaseTurnLease,
  type SandboxLease,
  sandboxLease,
  TAKEOVER_TIMEOUT_SEC,
} from "@/server/sandbox/lease"

const models = createAiSdkModels()
const keyVault = createEnvKeyVault(env.ENCRYPTION_KEY)
const blobs = createPostgresBlobStore()
const modelCatalog = createAiGatewayCatalog()
const sandboxes = createDaytonaSandboxes(env.DAYTONA_SNAPSHOT)
const telemetry = createOtelTelemetry(env.NODE_ENV)
const log = createPinoLogger()
const runtime = triggerTurnRuntime

const HANDED_BACK =
  "The person took control of your screen and has now given it back. They may have changed what's on it, so look at the screen again before you go on."

const JUDGE_CHOICE_TTL_MS = 60 * 60 * 1000

const providerModelCache = new Map<
  Provider,
  { models: Promise<CatalogModel[]>; at: number }
>()

function providerModels(provider: Provider) {
  const cached = providerModelCache.get(provider)
  if (cached && Date.now() - cached.at < JUDGE_CHOICE_TTL_MS) {
    return cached.models
  }
  const models = modelCatalog.list(provider).catch((error) => {
    log.warn("Model list unavailable", { provider, err: error })
    return []
  })
  providerModelCache.set(provider, { models, at: Date.now() })
  return models
}

const NO_TOTALS: TurnTotals = {
  stepCount: 0,
  inputTokens: 0,
  outputTokens: 0,
  costUsd: 0,
}

type Turn = {
  id: string
  chatId: string
  team: TeamBot[]
  userMessageId: string
  handoff?: { event: HandoffEvent; at: number }
  base: TurnTotals
  judgeUsd: number
  risks: Map<string, ToolRisk>
  asking: boolean
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
  log: Logger
}

const turn = chat.local<{ current: Turn | null }>({ id: "turn" })

function currentTurn() {
  const current = turn.current
  if (!current) throw new Error("No turn is running.")
  return current
}

function turnCostUsd(current: Turn, steps: Turn["steps"]) {
  return (
    current.base.costUsd +
    current.judgeUsd +
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

async function passTask(input: {
  toBotId: string
  summary: string
  nextStep: string
}) {
  const current = currentTurn()
  const names = teamNames(current.team)
  const hop = {
    chatId: current.chatId,
    userMessageId: current.userMessageId,
    fromBotId: current.botId,
    ...input,
  }
  const reason = handoffRejection({
    fromBotId: current.botId,
    toBotId: input.toBotId,
    memberIds: [...names.keys()],
    hops: await listHops(current.chatId, current.userMessageId),
    worked: current.base.stepCount + current.steps.length > 0,
  })
  const row = await insertHandoff({
    ...hop,
    accepted: reason === null,
    rejectReason: reason,
  })
  if (reason) throw new HandoffRejected(reason)
  const at = row.createdAt.getTime()
  current.handoff = {
    event: { id: row.id, fromBotId: current.botId, ...input },
    at,
  }
  return { id: row.id, name: names.get(input.toBotId) ?? "", at }
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
  toModelOutput: (output) =>
    computerModelOutput(output, (id) => loadScreenshot(blobs, id)),
}

async function handBackMessage(
  computer: ComputerHandlers | undefined
): Promise<ModelMessage> {
  if (!computer) return { role: "user", content: HANDED_BACK }
  const output = await computer.toModelOutput(
    await computer.execute([{ type: "screenshot" }])
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

function stamp(started: "createdAt" | "resumedAt", botId?: string) {
  return ({ part }: { part: { type: string } }) => {
    if (part.type === "start") return { [started]: Date.now(), botId }
    if (part.type === "finish") return { finishedAt: Date.now() }
  }
}

export const teammateChat = chat
  .withUIMessage<TeammateMessage>({
    streamOptions: {
      sendReasoning: true,
      messageMetadata: stamp("createdAt"),
    },
  })
  .agent({
    id: TEAMMATE_CHAT_TASK,
    storage: postgresTranscriptStorage,
    tools: {
      ...noteTools(() => currentTurn().botId),
      ...sandboxTools(openSandbox),
      ...webTools(openSandbox),
      ...handoffTools(passTask),
      computer: computerTool(historyComputer),
    },
    onBoot: () => {
      turn.init({ current: null })
    },
    onFailure: async ({ payload, error }) => {
      log.error("Chat run failed", { chatId: payload.chatId, err: error })
      const ended = await endRunningTurns(payload.chatId)
      await Promise.all(
        ended.map((row) => releaseTurnLease(runtime, row.botId, row.id))
      )
    },
    run: async ({ chatId, messages, tools, signal, streamText }) => {
      const history = chat.history.all() as TeammateMessage[]
      const team = await findChatTeam(chatId)
      const answers = approvalAnswers(messages)
      const resumed =
        answers.length > 0 ? await resumeTurn(chatId, answers) : null
      const teammate = await findTeammate(
        resumed?.botId ??
          nextTeammate(
            history.findLast((message) => message.role === "user"),
            team.bots,
            team.lastBotId
          ).id
      )
      if (!teammate) throw new Error("This chat no longer exists.")
      const bot = { ...teammate, ...cappedLimits(teammate, teammateCaps) }
      const key = bot.providerKey
      if (!key) {
        throw new Error(
          `${bot.name} isn't connected to an AI provider yet. Pick one in ${bot.name}'s settings, then send your message again.`
        )
      }

      const model = await modelCatalog.find(key.provider, bot.modelId)
      const canSeeScreen = model?.vision ?? false
      const group = team.bots.length > 1
      const { id: turnId, interrupted } = resumed
        ? { id: resumed.id, interrupted: [] }
        : await startTurn(chatId, bot.id)
      const queueId = `queue-${turnId}`
      const scope = { chatId, userId: bot.userId, botId: bot.id, turnId }
      const current: Turn = {
        id: turnId,
        chatId,
        team: team.bots,
        userMessageId:
          history.findLast(
            (message) => message.role === "user" && !message.metadata?.handoff
          )?.id ?? "",
        base: resumed?.totals ?? NO_TOTALS,
        judgeUsd: 0,
        risks: new Map(),
        asking: false,
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
        log: log.child(scope),
      }
      turn.current = current
      chat.setUIMessageStreamOptions({
        onError: (error) =>
          error instanceof HandoffRejected ? error.message : current.failure,
        messageMetadata: stamp(resumed ? "resumedAt" : "createdAt", bot.id),
      })

      if (!resumed) {
        const spent = await spentSince(bot.id, new Date(Date.now() - DAY_MS))
        if (spent >= bot.dailyBudgetUsd) {
          current.reason = "daily_budget"
          return
        }
      }

      const { computer: genericComputer, handoff, ...solo } = tools
      const withoutScreen = group ? { ...solo, handoff } : solo
      if (canSeeScreen) {
        const execute = computerExecutor({
          desktop: async () => (await openSandbox()).desktop(),
          saveScreenshot: (data) => saveScreenshot(blobs, chatId, data),
          waitForControl: async () =>
            (await waitForTakeover(current)) ? HANDED_BACK : null,
        })
        current.computer = {
          execute,
          toModelOutput: historyComputer.toModelOutput,
        }
      }
      const turnTools: ToolSet = current.computer
        ? {
            ...withoutScreen,
            computer:
              models.nativeComputerTool(
                key.provider,
                bot.modelId,
                current.computer
              ) ?? genericComputer,
          }
        : withoutScreen

      const credentials = {
        provider: key.provider,
        baseUrl: key.baseUrl,
        apiKey: key.sealedKey ? keyVault.open(key.sealedKey) : undefined,
      }
      const judgeModelId =
        key.judgeModelId ??
        judgeModelFor(
          key.provider,
          await providerModels(key.provider),
          bot.modelId
        )
      const judgeModel = models.languageModel(credentials, judgeModelId)
      const judgePrice =
        judgeModelId === bot.modelId
          ? model
          : await modelCatalog.find(key.provider, judgeModelId)
      const decided = resumed?.decided ?? []
      const unshownAnswers = decided.map(({ toolCallId, at }) => ({
        toolCallId,
        at,
      }))
      const transcript = group
        ? await convertToModelMessages(teamView(history, bot.id, team.bots), {
            tools,
            ignoreIncompleteToolCalls: true,
          })
        : messages

      const handBacks: HandBack[] = []
      return streamText({
        ...telemetry.modelCall("teammate-turn", scope),
        model: models.languageModel(credentials, bot.modelId),
        system: systemPrompt({
          ...bot,
          canSeeScreen,
          team: group ? teamPrompt(bot.id, team.bots) : undefined,
        }),
        messages: interrupted.length
          ? [
              ...transcript,
              { role: "user", content: interruptedNote(interrupted) },
            ]
          : transcript,
        tools: withLedger(
          turnTools,
          toolCallLedger(turnId, (toolCallId) => current.risks.get(toolCallId))
        ),
        toolApproval: approvalGate({
          fullAuto: bot.fullAuto,
          askBefore: bot.askBefore,
          judge: async (call, seen) => {
            const verdict = await judgeRisk({
              model: judgeModel,
              call,
              messages: seen,
              abortSignal: signal,
              traced: telemetry.modelCall("risk-judge", scope),
            })
            current.judgeUsd += costUsd(judgePrice, verdict.usage)
            return verdict
          },
          answered: new Set(answers.map((answer) => answer.toolCallId)),
          approved: new Set(
            decided
              .filter((answer) => answer.approved)
              .map((answer) => answer.toolCallId)
          ),
          onResume: () => current.lease.ensure(),
          onAssessed: async ({ toolCallId, toolName, input }, assessment) => {
            if (!assessment.ask) {
              current.risks.set(toolCallId, assessment.risk)
              return
            }
            await askApproval(turnId, {
              toolCallId,
              toolName,
              input,
              risk: assessment.risk,
              reason: assessment.ask,
            })
            current.asking = true
          },
        }),
        abortSignal: signal,
        stopWhen: [
          () => current.handoff !== undefined,
          ({ steps }) => current.base.stepCount + steps.length >= bot.maxSteps,
          ({ steps }) => turnCostUsd(current, steps) >= bot.taskBudgetUsd,
        ],
        prepareStep: async ({ initialMessages, responseMessages }) => {
          for (const answer of unshownAnswers.splice(0)) {
            runtime.write({
              type: "data-answer",
              id: `answer-${answer.toolCallId}`,
              data: answer,
            })
          }
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
        onError: ({ error }) => {
          current.failed = true
          current.log.error("Model call failed", { err: error })
        },
      })
    },
    onBeforeTurnComplete: async ({ writer, stopped }) => {
      const current = turn.current
      if (!current) return
      turn.current = null

      const usage = totalUsage(current.steps)
      const totals: TurnTotals = {
        stepCount: current.base.stepCount + current.steps.length,
        inputTokens: current.base.inputTokens + usage.inputTokens,
        outputTokens: current.base.outputTokens + usage.outputTokens,
        costUsd: turnCostUsd(current, current.steps),
      }
      const handoff = stopped || current.failed ? undefined : current.handoff
      if (current.asking && !handoff && !stopped && !current.failed) {
        await pauseTurn(current.id, totals)
        await current.lease.hold(
          new Date(Date.now() + ANSWER_TIMEOUT_SEC * 1000 + LEASE_TTL_MS)
        )
        return
      }

      const reason =
        current.reason ??
        (handoff
          ? "handoff"
          : endReason({
              stopped,
              failed: current.failed,
              finishReason: current.steps.at(-1)?.finishReason,
              stepCount: totals.stepCount,
              maxSteps: current.maxSteps,
              costUsd: totals.costUsd,
              taskBudgetUsd: current.taskBudgetUsd,
            }))
      const notice = turnNotice(reason, { ...current, steps: totals.stepCount })
      if (notice) writer.write({ type: "data-notice", data: notice })

      await finishTurn(current.id, { endReason: reason, ...totals })
      current.log.info("Turn ended", { endReason: reason, ...totals })
      await current.lease.release()
      if (handoff) {
        const names = teamNames(current.team)
        await runtime.send(
          current.chatId,
          handoffMessage(
            handoff.event,
            {
              from: names.get(handoff.event.fromBotId) ?? "",
              to: names.get(handoff.event.toBotId) ?? "",
            },
            handoff.at
          )
        )
      }
    },
  })
