import { config } from "./config.js"
import { closePool } from "./db/client.js"
import { printDashboardSummary } from "./metrics.js"
import { captureIndexerError, flushSentry, initSentry } from "./sentry.js"
import { EventSubscriber } from "./subscriber.js"

initSentry()

const subscriber = new EventSubscriber(config.rpcUrl)
let running = true
let summaryTimer: ReturnType<typeof setInterval> | null = null

async function tick(): Promise<void> {
  await subscriber.pollAll(config.contracts)
}

async function shutdown(signal: string): Promise<void> {
  console.info(`[indexer] received ${signal}, shutting down`)
  running = false
  if (summaryTimer) clearInterval(summaryTimer)
  await closePool()
  await flushSentry()
  process.exit(0)
}

process.on("SIGINT", () => void shutdown("SIGINT"))
process.on("SIGTERM", () => void shutdown("SIGTERM"))

async function main(): Promise<void> {
  console.info("[indexer] starting Lernza event indexer")
  console.info(`[indexer] RPC: ${config.rpcUrl}`)
  console.info(`[indexer] contracts: ${config.contracts.map(c => c.type).join(", ")}`)

  // Print dashboard summary every hour
  summaryTimer = setInterval(() => {
    printDashboardSummary().catch(err => captureIndexerError(err, { phase: "metrics" }))
  }, 60 * 60 * 1000)

  while (running) {
    try {
      await tick()
    } catch (error) {
      captureIndexerError(error, { phase: "poll" })
    }
    await new Promise(resolve => setTimeout(resolve, config.pollIntervalMs))
  }
}

main().catch(error => {
  captureIndexerError(error, { phase: "startup" })
  process.exit(1)
})
