/** Shared UI types consumed across dashboard sub-components. */

export interface ActivityEvent {
  id: string
  user: string
  action: "enrolled" | "completed" | "created"
  questName: string
  timestamp: number
}

export interface EarningsDataPoint {
  date: string
  amount: number
}
