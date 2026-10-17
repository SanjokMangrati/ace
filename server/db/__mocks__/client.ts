import { PGlite } from "@electric-sql/pglite"
import { pushSchema } from "drizzle-kit/api"
import { drizzle } from "drizzle-orm/pglite"
import * as schema from "@/server/db/schema"

export const db = drizzle({ client: new PGlite(), schema })

const { apply } = await pushSchema(schema, db as never)
await apply()
