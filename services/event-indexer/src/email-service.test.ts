// @ts-nocheck
import { describe, it, expect, vi } from "vitest"
import { EmailService } from "./email-service.js"
import { NotificationDispatcher } from "./notification-dispatcher.js"

describe("Email Notification Service & Dispatcher Tests", () => {
  it("renders and sends quest status change email alerts", async () => {
    const service = new EmailService()
    const result = await service.sendQuestStatusAlert({
      recipientEmail: "test@lernza.io",
      questName: "Web3 Engineering 101",
      questId: 42,
      status: "updated",
      details: "Updated description and reward pool",
    })

    expect(result).toBe(true)
  })

  it("renders and sends milestone completion email alerts", async () => {
    const service = new EmailService()
    const result = await service.sendMilestoneCompletionAlert({
      recipientEmail: "learner@lernza.io",
      questName: "Web3 Engineering 101",
      milestoneTitle: "Build Smart Contract",
      status: "approved",
    })

    expect(result).toBe(true)
  })

  it("renders and sends fund distribution email alerts", async () => {
    const service = new EmailService()
    const result = await service.sendFundDistributionAlert({
      recipientEmail: "owner@lernza.io",
      questName: "Web3 Engineering 101",
      amount: "500 USDC",
      actionType: "funded",
      txHash: "0x123abc...",
    })

    expect(result).toBe(true)
  })

  it("dispatches contract events correctly via NotificationDispatcher", async () => {
    const dispatcher = new NotificationDispatcher()
    await expect(
      dispatcher.handleEvent({
        contractType: "quest",
        eventName: "quest_created",
        payload: [1, "G123...", "My New Quest"],
        txHash: "0xhash123",
      })
    ).resolves.not.toThrow()

    await expect(
      dispatcher.handleEvent({
        contractType: "reward",
        eventName: "reward_claimed",
        payload: { amount: 100 },
        txHash: "0xhash456",
      })
    ).resolves.not.toThrow()
  })
})
