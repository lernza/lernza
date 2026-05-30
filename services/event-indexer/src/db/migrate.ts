import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { getPool, closePool } from "./client.js"

const __dirname = dirname(fileURLToPath(import.meta.url))

async function migrate(): Promise<void> {
  const schemaPath = join(__dirname, "../../db/schema.sql")
  const sql = readFileSync(schemaPath, "utf-8")
  await getPool().query(sql)
  console.info("[migrate] schema applied")
  await closePool()
}

migrate().catch(err => {
  console.error("[migrate] failed:", err)
  process.exit(1)
})
