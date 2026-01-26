import { format } from "date-fns"
import { ar } from "date-fns/locale"

/**
 * Parse a date string (YYYY-MM-DD) to a Date object without timezone issues
 * This ensures the date is interpreted in local timezone, not UTC
 */
export function parseLocalDate(dateString: string): Date {
  // Add T12:00:00 to avoid timezone issues (noon is safe from day shifts)
  return new Date(dateString + "T12:00:00")
}

/**
 * Format a date string for display in Arabic
 */
export function formatDate(dateString: string, formatStr: string = "d MMMM yyyy"): string {
  const date = parseLocalDate(dateString)
  return format(date, formatStr, { locale: ar })
}

/**
 * Format a date string to show day name in Arabic
 */
export function formatDayName(dateString: string): string {
  const date = parseLocalDate(dateString)
  return format(date, "EEEE", { locale: ar })
}
