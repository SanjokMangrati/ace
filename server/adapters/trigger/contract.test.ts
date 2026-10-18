import { describe } from "vitest"
import { chatRuntimeContract } from "@/server/contracts/chat-runtime"
import { liveWith } from "@/server/contracts/live"
import { createTriggerChatRuntime } from "./chat-runtime"

describe.runIf(liveWith("TRIGGER_SECRET_KEY"))(
  "live",
  { timeout: 120_000 },
  () => {
    chatRuntimeContract("Trigger.dev", createTriggerChatRuntime)
  }
)
