/**
 * Data backup and export/restore procedure utility (Issue #1262).
 * Handles export, validation, and restoration of off-chain application state & transaction queues.
 */
import { logger } from "./logger"

export interface BackupData {
  version: string
  timestamp: string
  transactionQueue: unknown
  userPreferences: unknown
  cache: Record<string, unknown>
}

export class BackupManager {
  private static BACKUP_VERSION = "1.0.0"

  /**
   * Export full off-chain application state to a JSON backup structure.
   */
  static exportBackup(): BackupData {
    const backup: BackupData = {
      version: this.BACKUP_VERSION,
      timestamp: new Date().toISOString(),
      transactionQueue: null,
      userPreferences: null,
      cache: {},
    }

    if (typeof window !== "undefined" && window.localStorage) {
      try {
        const rawTxQueue = window.localStorage.getItem("lernza_tx_queue")
        if (rawTxQueue) {
          backup.transactionQueue = JSON.parse(rawTxQueue)
        }

        const rawPrefs = window.localStorage.getItem("lernza_user_prefs")
        if (rawPrefs) {
          backup.userPreferences = JSON.parse(rawPrefs)
        }

        // Collect all lernza cache entries
        for (let i = 0; i < window.localStorage.length; i++) {
          const key = window.localStorage.key(i)
          if (key?.startsWith("lernza_cache_")) {
            const rawVal = window.localStorage.getItem(key)
            if (rawVal) {
              backup.cache[key] = JSON.parse(rawVal)
            }
          }
        }
      } catch (err) {
        logger.error("Error exporting backup data", { err })
      }
    }

    return backup
  }

  /**
   * Trigger browser download of the generated JSON backup file.
   */
  static downloadBackup(): void {
    const backup = this.exportBackup()
    const jsonStr = JSON.stringify(backup, null, 2)
    const blob = new Blob([jsonStr], { type: "application/json" })
    const url = URL.createObjectURL(blob)

    const link = document.createElement("a")
    link.href = url
    link.download = `lernza_backup_${new Date().toISOString().slice(0, 10)}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  /**
   * Restore application state from a valid backup JSON object.
   */
  static restoreBackup(backup: BackupData): boolean {
    if (!backup || !backup.version) {
      logger.error("Invalid backup structure provided")
      return false
    }

    if (typeof window !== "undefined" && window.localStorage) {
      try {
        if (backup.transactionQueue) {
          window.localStorage.setItem(
            "lernza_tx_queue",
            JSON.stringify(backup.transactionQueue),
          )
        }

        if (backup.userPreferences) {
          window.localStorage.setItem(
            "lernza_user_prefs",
            JSON.stringify(backup.userPreferences),
          )
        }

        if (backup.cache) {
          Object.entries(backup.cache).forEach(([k, v]) => {
            window.localStorage.setItem(k, JSON.stringify(v))
          })
        }

        logger.info("Backup successfully restored")
        return true
      } catch (err) {
        logger.error("Failed to restore backup", { err })
        return false
      }
    }

    return false
  }
}
