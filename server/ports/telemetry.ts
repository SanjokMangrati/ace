import type { TelemetryOptions } from "ai"

export type TraceScope = {
  chatId: string
  userId: string
  botId: string
  turnId: string
}

type TracedContext = { trace: TraceScope }

export type TracedCall = {
  runtimeContext: TracedContext
  telemetry: TelemetryOptions<TracedContext>
}

export interface Telemetry {
  modelCall(functionId: string, scope: TraceScope): TracedCall
}
