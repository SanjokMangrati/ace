import type { Instrumentation } from "next"

export const onRequestError: Instrumentation.onRequestError = async (
  error,
  request,
  context
) => {
  if (process.env.NEXT_RUNTIME !== "nodejs") return
  const { logger } = await import("@/server/container")
  logger.error("Request failed", {
    err: error,
    method: request.method,
    path: request.path.split("?")[0],
    routePath: context.routePath,
    routeType: context.routeType,
  })
}
