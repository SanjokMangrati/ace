import { telemetryContract } from "@/server/contracts/telemetry"
import { createOtelTelemetry } from "."

telemetryContract("OpenTelemetry", () => createOtelTelemetry("test"))
