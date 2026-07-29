import { emailService } from "./email-service.js"

export interface ContractEventNotification {
  contractType: "quest" | "milestone" | "reward" | string
  eventName: string
  payload: unknown
  txHash: string
}

export class NotificationDispatcher {
  async handleEvent(event: ContractEventNotification): Promise<void> {
    const { contractType, eventName, payload, txHash } = event

    try {
      if (contractType === "quest") {
        await this.handleQuestEvent(eventName, payload)
      } else if (contractType === "milestone") {
        await this.handleMilestoneEvent(eventName, payload)
      } else if (contractType === "reward") {
        await this.handleRewardEvent(eventName, payload, txHash)
      }
    } catch (error) {
      console.error(`[notification-dispatcher] Failed handling event ${eventName}:`, error)
    }
  }

  private async handleQuestEvent(eventName: string, payload: unknown): Promise<void> {
    if (eventName === "quest_created" || eventName === "quest_updated" || eventName === "quest_archived" || eventName === "quest_cancelled") {
      const data = payload as { questId?: number; owner?: string; name?: string } | Array<unknown>
      const questId = Array.isArray(data) ? data[0] : data.questId || 0
      const questName = Array.isArray(data) ? data[2] || `Quest #${questId}` : data.name || `Quest #${questId}`

      const statusMap: Record<string, "created" | "updated" | "archived" | "cancelled"> = {
        quest_created: "created",
        quest_updated: "updated",
        quest_archived: "archived",
        quest_cancelled: "cancelled",
      }

      const status = statusMap[eventName]
      if (status) {
        // Send alert to quest creator/subscriber email if available
        await emailService.sendQuestStatusAlert({
          recipientEmail: "owner@lernza.io", // Default alert destination or user preference lookup
          questName: String(questName),
          questId: Number(questId),
          status,
        })
      }
    }
  }

  private async handleMilestoneEvent(eventName: string, payload: unknown): Promise<void> {
    if (eventName === "submission_approved" || eventName === "submission_rejected") {
      const data = payload as { questId?: number; milestoneId?: number; enrollee?: string } | Array<unknown>
      const milestoneTitle = Array.isArray(data) ? `Milestone #${data[1]}` : `Milestone #${data.milestoneId || 1}`
      const status = eventName === "submission_approved" ? "approved" : "rejected"

      await emailService.sendMilestoneCompletionAlert({
        recipientEmail: "learner@lernza.io",
        questName: "Lernza Quest",
        milestoneTitle,
        status,
      })
    }
  }

  private async handleRewardEvent(eventName: string, payload: unknown, txHash: string): Promise<void> {
    if (eventName === "reward_claimed" || eventName === "escrow_funded" || eventName === "escrow_refunded") {
      const actionMap: Record<string, "funded" | "claimed" | "refunded"> = {
        escrow_funded: "funded",
        reward_claimed: "claimed",
        escrow_refunded: "refunded",
      }

      const actionType = actionMap[eventName]
      if (actionType) {
        await emailService.sendFundDistributionAlert({
          recipientEmail: "user@lernza.io",
          questName: "Lernza Quest",
          amount: "USDC Reward",
          actionType,
          txHash,
        })
      }
    }
  }
}

export const notificationDispatcher = new NotificationDispatcher()
