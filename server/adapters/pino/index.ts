import { trace } from "@opentelemetry/api"
import pino from "pino"
import type { Logger } from "@/server/ports/logger"

const SECRET_KEYS = [
  "apiKey",
  "sealedKey",
  "authorization",
  "cookie",
  "password",
  "secret",
  "token",
]

function serializeError(error: Error) {
  const { type, message, stack, code, statusCode } =
    pino.stdSerializers.err(error)
  return { type, message, stack, code, statusCode }
}

function wrap(log: pino.Logger): Logger {
  return {
    info: (message, fields = {}) => log.info(fields, message),
    warn: (message, fields = {}) => log.warn(fields, message),
    error: (message, fields = {}) => log.error(fields, message),
    child: (fields) => wrap(log.child(fields)),
  }
}

export function createPinoLogger(destination?: pino.DestinationStream): Logger {
  return wrap(
    pino(
      {
        redact: {
          paths: SECRET_KEYS.flatMap((key) => [key, `*.${key}`]),
          censor: "[redacted]",
        },
        serializers: { err: serializeError },
        mixin: () => {
          const span = trace.getActiveSpan()?.spanContext()
          return span ? { traceId: span.traceId, spanId: span.spanId } : {}
        },
      },
      destination
    )
  )
}
