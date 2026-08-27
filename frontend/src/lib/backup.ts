/**
 * Data backup and export/restore procedure utility (Issue #1262, #1501).
 * Handles export, validation, and restoration of off-chain application state,
 * transaction queues, and learner profile metadata.
 */
import { logger } from "./logger"
import type { LearnerProfile } from "./profile-types"
import { validateFullProfile } from "./profile-validation"

export interface BackupData {
  version: string
  timestamp: string
  transactionQueue: unknown
  userPreferences: unknown
  profiles: Record<string, LearnerProfile>
  cache: Record<string, unknown>
}

export class BackupManager {
  private static BACKUP_VERSION = "1.1.0"
  private static PROFILE_KEY_PREFIX = "lernza_profile_"

  /**
   * Export full off-chain application state to a JSON backup structure.
   */
  static exportBackup(): BackupData {
    const backup: BackupData = {
      version: this.BACKUP_VERSION,
      timestamp: new Date().toISOString(),
      transactionQueue: null,
      userPreferences: null,
      profiles: {},
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

        for (let i = 0; i < window.localStorage.length; i++) {
          const key = window.localStorage.key(i)
          if (!key) continue

          if (key.startsWith(this.PROFILE_KEY_PREFIX)) {
            const walletAddress = key.slice(this.PROFILE_KEY_PREFIX.length)
            const rawVal = window.localStorage.getItem(key)
            if (rawVal) {
              try {
                const profile = JSON.parse(rawVal) as LearnerProfile
                backup.profiles[walletAddress] = profile
              } catch (parseErr) {
                logger.warn("Skipping invalid profile in backup export", {
                  key,
                  err: parseErr,
                })
              }
            }
          }

          if (key.startsWith("lernza_cache_")) {
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

        if (backup.profiles) {
          Object.entries(backup.profiles).forEach(([walletAddress, profile]) => {
            const validation = validateFullProfile(profile)
            if (validation.valid) {
              window.localStorage.setItem(
                `${this.PROFILE_KEY_PREFIX}${walletAddress}`,
                JSON.stringify(profile),
              )
            } else {
              logger.warn("Skipping invalid profile in backup restore", {
                walletAddress,
                errors: validation.errors,
              })
            }
          })
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
