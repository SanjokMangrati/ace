import type { Telemetry } from "@/server/ports/telemetry"

export function createFakeTelemetry(): Telemetry & { functionIds: string[] } {
  const functionIds: string[] = []
  return {
    functionIds,
    modelCall: (functionId, trace) => {
      functionIds.push(functionId)
      return {
        runtimeContext: { trace },
        telemetry: { functionId, includeRuntimeContext: { trace: true } },
      }
    },
  }
}
