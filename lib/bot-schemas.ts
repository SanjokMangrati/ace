import { createInsertSchema } from "drizzle-zod"
import { z } from "zod"
import {
  checkProviderKey,
  providerKeyFieldsSchema,
} from "@/lib/provider-key-schemas"
import { bot, toolGroup } from "@/server/db/schema/bots"

const BOT_NAME_MAX_LENGTH = 40
const BOT_JOB_MAX_LENGTH = 120
const BOT_INSTRUCTIONS_MAX_LENGTH = 4000
export const MAX_STEPS_LIMIT = 500
const BUDGET_MAX_USD = 1000
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

function budget(label: string) {
  return z
    .number({ error: `Enter an amount for ${label}, like 1.00.` })
    .min(0.01, `Spend at least $0.01 ${label}.`)
    .max(BUDGET_MAX_USD, `Keep it at $${BUDGET_MAX_USD} or less ${label}.`)
}

export const botFormSchema = createInsertSchema(bot, {
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
  modelId: (schema) =>
    schema
      .trim()
      .min(1, "Pick a model.")
      .max(200, "That model name is too long."),
  maxSteps: () =>
    z
      .number({ error: "Enter a number of steps, like 50." })
      .int("Use a whole number of steps.")
      .min(1, "Allow at least 1 step.")
      .max(MAX_STEPS_LIMIT, `Keep it at ${MAX_STEPS_LIMIT} steps or fewer.`),
  taskBudgetUsd: () => budget("on one task"),
  dailyBudgetUsd: () => budget("a day"),
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
    askBefore: z.object(
      Object.fromEntries(TOOL_GROUPS.map((tool) => [tool, z.boolean()])) as {
        [K in ToolGroup]: z.ZodBoolean
      }
    ),
  })

export type BotFormInput = z.infer<typeof botFormSchema>

export const NEW_KEY = "new"

export const teammateFormSchema = botFormSchema
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

export type TeammateFormInput = z.infer<typeof teammateFormSchema>

export const ADVANCED_FIELDS = [
  "fullAuto",
  "askBefore",
  "maxSteps",
  "taskBudgetUsd",
  "dailyBudgetUsd",
] as const satisfies readonly (keyof TeammateFormInput)[]

export const botIdSchema = z.uuid()
