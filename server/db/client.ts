import { drizzle } from "drizzle-orm/node-postgres"
import { Pool } from "pg"
import * as schema from "@/server/db/schema"
import { env } from "@/server/env"

const globalForDb = globalThis as unknown as { pool?: Pool }

const pool =
  globalForDb.pool ?? new Pool({ connectionString: env.DATABASE_URL })

if (env.NODE_ENV !== "production") globalForDb.pool = pool

export const db = drizzle({ client: pool, schema })

export type Db = typeof db
