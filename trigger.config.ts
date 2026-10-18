import { loadEnvConfig } from "@next/env"
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http"
import { additionalPackages } from "@trigger.dev/build/extensions/core"
import { defineConfig } from "@trigger.dev/sdk"

loadEnvConfig(process.cwd())

const project = process.env.TRIGGER_PROJECT_REF
if (!project) throw new Error("TRIGGER_PROJECT_REF is not set")

function langfuseExporters() {
  const publicKey = process.env.LANGFUSE_PUBLIC_KEY
  const secretKey = process.env.LANGFUSE_SECRET_KEY
  if (!publicKey || !secretKey) return []
  const baseUrl = process.env.LANGFUSE_BASE_URL ?? "https://cloud.langfuse.com"
  return [
    new OTLPTraceExporter({
      url: `${baseUrl}/api/public/otel/v1/traces`,
      headers: {
        Authorization: `Basic ${Buffer.from(`${publicKey}:${secretKey}`).toString("base64")}`,
        "x-langfuse-ingestion-version": "4",
      },
    }),
  ]
}

export default defineConfig({
  project,
  dirs: ["./trigger"],
  maxDuration: 3600,
  telemetry: { exporters: langfuseExporters() },
  build: {
    conditions: ["react-server"],
    extensions: [
      additionalPackages({ packages: ["form-data@4.0.6", "busboy@1.6.0"] }),
    ],
  },
})
