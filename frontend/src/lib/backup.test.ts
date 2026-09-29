import { describe, it, expect } from "vitest"
import { BackupManager } from "./backup"

describe("BackupManager", () => {
  it("exports valid backup object structure", () => {
    const backup = BackupManager.exportBackup()
    expect(backup).toBeDefined()
    expect(backup.version).toBe("1.1.0")
    expect(backup.timestamp).toBeDefined()
  })

  it("restores backup correctly", () => {
    const backupData = {
      version: "1.0.0",
      timestamp: new Date().toISOString(),
      transactionQueue: [{ id: "tx1" }],
      userPreferences: { theme: "dark" },
      cache: {},
    }

    const success = BackupManager.restoreBackup(backupData)
    expect(success).toBe(true)
  })
})
