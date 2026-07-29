/**
 * Date and timezone utilities for quest deadlines
 * Fixes issue #1204: Date picker timezone issues
 */

/**
 * Converts a local datetime-local input value to UTC Unix timestamp (seconds)
 * @param localDateTimeString - String from datetime-local input (format: "YYYY-MM-DDTHH:mm")
 * @returns Unix timestamp in seconds (UTC)
 */
export function localDateTimeToUTC(localDateTimeString: string): number {
  if (!localDateTimeString) return 0
  const date = new Date(localDateTimeString)
  return Math.floor(date.getTime() / 1000)
}

/**
 * Converts a UTC Unix timestamp (seconds) to a local datetime-local input value
 * @param utcTimestamp - Unix timestamp in seconds (UTC)
 * @returns String formatted for datetime-local input (format: "YYYY-MM-DDTHH:mm")
 */
export function utcToLocalDateTime(utcTimestamp: number): string {
  if (!utcTimestamp || utcTimestamp <= 0) return ""
  const date = new Date(utcTimestamp * 1000)
  
  // Format: YYYY-MM-DDTHH:mm (required for datetime-local input)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  const hours = String(date.getHours()).padStart(2, "0")
  const minutes = String(date.getMinutes()).padStart(2, "0")
  
  return `${year}-${month}-${day}T${hours}:${minutes}`
}

/**
 * Gets the minimum datetime-local value (now in local timezone)
 * Useful for preventing users from selecting past dates
 */
export function getMinDateTimeLocal(): string {
  const now = new Date()
  return utcToLocalDateTime(Math.floor(now.getTime() / 1000))
}

/**
 * Formats a UTC timestamp for display, showing user's local timezone
 * @param utcTimestamp - Unix timestamp in seconds (UTC)
 * @param options - Intl.DateTimeFormatOptions
 */
export function formatUTCTimestamp(
  utcTimestamp: number,
  options: Intl.DateTimeFormatOptions = {
    dateStyle: "medium",
    timeStyle: "short",
  }
): string {
  if (!utcTimestamp || utcTimestamp <= 0) return "No deadline"
  return new Date(utcTimestamp * 1000).toLocaleString([], options)
}

/**
 * Shows timezone info for debugging/display
 */
export function getUserTimezoneInfo(): string {
  const offset = -new Date().getTimezoneOffset()
  const hours = Math.floor(Math.abs(offset) / 60)
  const minutes = Math.abs(offset) % 60
  const sign = offset >= 0 ? "+" : "-"
  return `UTC${sign}${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`
}
