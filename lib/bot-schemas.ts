import { createInsertSchema } from "drizzle-zod"
import { z } from "zod"
import { MODEL_ID_MAX_LENGTH, MODEL_ID_TOO_LONG } from "@/lib/models"
import {
  checkProviderKey,
  providerKeyFieldsSchema,
} from "@/lib/provider-key-schemas"
import { bot, toolGroup } from "@/server/db/schema/bots"

const BOT_NAME_MAX_LENGTH = 40
const BOT_JOB_MAX_LENGTH = 120
const BOT_INSTRUCTIONS_MAX_LENGTH = 4000
export const PICTURE_MAX_BYTES = 256 * 1024
export const PICTURE_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
] as const

export type PictureType = (typeof PICTURE_TYPES)[number]

export const PICTURE_TYPE_MESSAGE = "Use a PNG, JPEG, WebP or GIF picture."
export const PICTURE_SIZE_MESSAGE = `That picture is too big. Pick one under ${PICTURE_MAX_BYTES / 1024} KB.`

export const TEAMMATE_NOT_FOUND =
  "We couldn't find this teammate. It may have been deleted."

const PICK_PROVIDER_MESSAGE = "Pick an AI provider."
export const PICK_SAVED_PROVIDER = "Pick one of your AI providers."
export const PICK_LISTED_MODEL = "Pick a model from the list."

export const TOOL_GROUPS = toolGroup.enumValues

export type ToolGroup = (typeof TOOL_GROUPS)[number]

export const DEFAULT_ASK_BEFORE: Record<ToolGroup, boolean> = {
  shell: true,
  files_write: true,
  computer: true,
  files_read: false,
  notes: false,
  handoff: false,
}

export function askBeforeFrom(
  policies: readonly { tool: ToolGroup; requiresApproval: boolean }[]
) {
  const askBefore = { ...DEFAULT_ASK_BEFORE }
  for (const policy of policies) {
    askBefore[policy.tool] = policy.requiresApproval
  }
  return askBefore
}

export type TeammateLimits = {
  maxSteps: number
  taskBudgetUsd: number
  dailyBudgetUsd: number
}

export const LIMIT_CEILINGS: TeammateLimits = {
  maxSteps: 500,
  taskBudgetUsd: 1000,
  dailyBudgetUsd: 1000,
}

export const DEFAULT_LIMITS: TeammateLimits = {
  maxSteps: 50,
  taskBudgetUsd: 1,
  dailyBudgetUsd: 5,
}

export function cappedLimits(
  limits: TeammateLimits,
  caps: TeammateLimits
): TeammateLimits {
  return {
    maxSteps: Math.min(limits.maxSteps, caps.maxSteps),
    taskBudgetUsd: Math.min(limits.taskBudgetUsd, caps.taskBudgetUsd),
    dailyBudgetUsd: Math.min(limits.dailyBudgetUsd, caps.dailyBudgetUsd),
  }
}

export function modelIdSchema(schema: z.ZodString) {
  return schema
    .trim()
    .min(1, "Pick a model.")
    .max(MODEL_ID_MAX_LENGTH, MODEL_ID_TOO_LONG)
}

function budget(label: string, maxUsd: number) {
  return z
    .number({ error: `Enter an amount for ${label}, like 1.00.` })
    .min(0.01, `Spend at least $0.01 ${label}.`)
    .max(maxUsd, `Keep it at $${maxUsd} or less ${label}.`)
}

export function botFormSchema(caps = LIMIT_CEILINGS) {
  return createInsertSchema(bot, {
    name: (schema) =>
      schema
        .trim()
        .min(1, "Give your teammate a name.")
        .max(
          BOT_NAME_MAX_LENGTH,
          `Keep the name to ${BOT_NAME_MAX_LENGTH} characters or fewer.`
        ),
    job: (schema) =>
      schema
        .trim()
        .min(1, "Say in a few words what this teammate does.")
        .max(
          BOT_JOB_MAX_LENGTH,
          `Keep the job to ${BOT_JOB_MAX_LENGTH} characters or fewer.`
        ),
    instructions: (schema) =>
      schema
        .trim()
        .max(
          BOT_INSTRUCTIONS_MAX_LENGTH,
          `Keep the instructions to ${BOT_INSTRUCTIONS_MAX_LENGTH} characters or fewer.`
        ),
    modelId: modelIdSchema,
    maxSteps: () =>
      z
        .number({ error: "Enter a number of steps, like 50." })
        .int("Use a whole number of steps.")
        .min(1, "Allow at least 1 step.")
        .max(caps.maxSteps, `Keep it at ${caps.maxSteps} steps or fewer.`),
    taskBudgetUsd: () => budget("on one task", caps.taskBudgetUsd),
    dailyBudgetUsd: () => budget("a day", caps.dailyBudgetUsd),
  })
    .pick({
      name: true,
      job: true,
      instructions: true,
      providerKeyId: true,
      modelId: true,
      fullAuto: true,
      maxSteps: true,
      taskBudgetUsd: true,
      dailyBudgetUsd: true,
    })
    .required()
    .extend({
      providerKeyId: z.uuid({ error: PICK_PROVIDER_MESSAGE }),
      askBefore: z.record(z.enum(TOOL_GROUPS), z.boolean()),
    })
}

export type BotFormInput = z.infer<ReturnType<typeof botFormSchema>>

export const NEW_KEY = "new"

export function teammateFormSchema(caps = LIMIT_CEILINGS) {
  return botFormSchema(caps)
    .extend({
      providerKeyId: z.union(
        [
          z.uuid({ error: PICK_PROVIDER_MESSAGE }),
          z.literal(NEW_KEY, { error: PICK_PROVIDER_MESSAGE }),
        ],
        { error: PICK_PROVIDER_MESSAGE }
      ),
      newKey: providerKeyFieldsSchema,
    })
    .superRefine((value, ctx) => {
      if (value.providerKeyId === NEW_KEY) {
        checkProviderKey(value.newKey, ctx, ["newKey"])
      }
    })
}

export type TeammateFormInput = z.infer<ReturnType<typeof teammateFormSchema>>

export const ADVANCED_FIELDS = [
  "fullAuto",
  "askBefore",
  "maxSteps",
  "taskBudgetUsd",
  "dailyBudgetUsd",
] as const satisfies readonly (keyof TeammateFormInput)[]

export const botIdSchema = z.uuid()
