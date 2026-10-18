import { OpenTelemetry } from "@ai-sdk/otel"
import { registerTelemetry } from "ai"
import type { Telemetry, TraceScope } from "@/server/ports/telemetry"

function scopeAttributes(scope: TraceScope) {
  return {
    "session.id": scope.chatId,
    "user.id": scope.userId,
    "gen_ai.agent.id": scope.botId,
    "ace.turn.id": scope.turnId,
  }
}

export function createOtelTelemetry(environment: string): Telemetry {
  registerTelemetry(
    new OpenTelemetry({
      enrichSpan: ({ runtimeContext }) => {
        const scope = runtimeContext?.trace as TraceScope | undefined
        return {
          "deployment.environment.name": environment,
          ...(scope && scopeAttributes(scope)),
        }
      },
    })
  )

  return {
    modelCall: (functionId, trace) => ({
      runtimeContext: { trace },
      telemetry: { functionId, includeRuntimeContext: { trace: true } },
    }),
  }
}
