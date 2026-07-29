import React from "react"
import { describe, it, expect, vi } from "vitest"
import { render, screen, act, fireEvent } from "@testing-library/react"
import { NotificationProvider, useNotifications } from "./notification-context"
import { ToastContainer } from "@/components/toast"
import { NotificationPreferencesCard } from "@/components/notification-preferences"

function TestComponent() {
  const {
    toasts,
    addToast,
    notifyQuestStatusChange,
    notifyMilestoneCompletion,
    notifyRewardDistribution,
  } = useNotifications()

  return (
    <div>
      <div data-testid="toast-count">{toasts.length}</div>
      <button
        onClick={() => notifyQuestStatusChange("Rust Basics", "created")}
      >
        Trigger Quest Created
      </button>
      <button
        onClick={() => notifyQuestStatusChange("Rust Basics", "archived")}
      >
        Trigger Quest Archived
      </button>
      <button
        onClick={() => notifyMilestoneCompletion("Build Smart Contract", "approved")}
      >
        Trigger Milestone Approved
      </button>
      <button
        onClick={() => notifyRewardDistribution("100 USDC", "claimed")}
      >
        Trigger Reward Claimed
      </button>
      <button
        onClick={() =>
          addToast({
            title: "Custom Title",
            message: "Custom Message",
            type: "warning",
            category: "system",
          })
        }
      >
        Trigger Warning Toast
      </button>
    </div>
  )
}

describe("Notification System Frontend Tests", () => {
  it("dispatches toast notifications for quest status changes", async () => {
    render(
      <NotificationProvider>
        <TestComponent />
        <ToastContainer />
      </NotificationProvider>
    )

    const btn = screen.getByText("Trigger Quest Created")
    fireEvent.click(btn)

    expect(await screen.findByText("Quest Live!")).toBeDefined()
    expect(screen.getByText(/is now active on Stellar/i)).toBeDefined()
  })

  it("dispatches toast notifications for milestone completions", async () => {
    render(
      <NotificationProvider>
        <TestComponent />
        <ToastContainer />
      </NotificationProvider>
    )

    fireEvent.click(screen.getByText("Trigger Milestone Approved"))

    expect(await screen.findByText("Milestone Approved!")).toBeDefined()
    expect(screen.getByText(/has been verified/i)).toBeDefined()
  })

  it("dispatches toast notifications for reward distributions", async () => {
    render(
      <NotificationProvider>
        <TestComponent />
        <ToastContainer />
      </NotificationProvider>
    )

    fireEvent.click(screen.getByText("Trigger Reward Claimed"))

    expect(await screen.findByText("Reward Claimed!")).toBeDefined()
    expect(screen.getByText(/You claimed 100 USDC/i)).toBeDefined()
  })

  it("renders warning toasts with custom titles", async () => {
    render(
      <NotificationProvider>
        <TestComponent />
        <ToastContainer />
      </NotificationProvider>
    )

    fireEvent.click(screen.getByText("Trigger Warning Toast"))

    expect(await screen.findByText("Custom Title")).toBeDefined()
    expect(screen.getByText("Custom Message")).toBeDefined()
  })

  it("allows toggling preferences in NotificationPreferencesCard", async () => {
    render(
      <NotificationProvider>
        <NotificationPreferencesCard />
      </NotificationProvider>
    )

    expect(screen.getByText("Toast Notifications")).toBeDefined()
    expect(screen.getByText("Email Alerts")).toBeDefined()
    expect(screen.getByText("Quest Status Changes")).toBeDefined()
  })
})
