import React from "react"
import { describe, it, expect } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { NotificationProvider, useNotifications } from "./notification-context"
import { ToastContainer } from "@/components/toast"
import { NotificationPreferencesCard } from "@/components/notification-preferences"

function TestComponent() {
  const {
    toasts,
    addToast,
    notifyEnrollment,
    notifySubmission,
    notifyVerification,
    notifyRewardDistribution,
    notifyDeadlineReminder,
    notifyQuestCancellation,
    notifyQuestStatusChange,
    notifyMilestoneCompletion,
  } = useNotifications()

  return (
    <div>
      <div data-testid="toast-count">{toasts.length}</div>
      <button onClick={() => notifyEnrollment("Rust Fundamentals", "GBEMI1234567890ABCDEF")}>
        Trigger Enrollment
      </button>
      <button onClick={() => notifySubmission("Rust Fundamentals", "Milestone 1 Proof")}>
        Trigger Submission
      </button>
      <button
        onClick={() =>
          notifyVerification("Milestone 1 Proof", "approved", "Excellent clean tests!")
        }
      >
        Trigger Verification
      </button>
      <button onClick={() => notifyRewardDistribution("500 XLM", "claimed")}>
        Trigger Reward
      </button>
      <button onClick={() => notifyDeadlineReminder("Rust Fundamentals", "2 days")}>
        Trigger Deadline
      </button>
      <button onClick={() => notifyQuestCancellation("Deprecated Quest", "Audit requirement")}>
        Trigger Cancellation
      </button>
      <button onClick={() => notifyQuestStatusChange("Rust Basics", "created")}>
        Create Quest Notification
      </button>
      <button onClick={() => notifyMilestoneCompletion("Build Smart Contract", "approved")}>
        Approve Milestone Notification
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
        Show Warning Notification
      </button>
    </div>
  )
}

describe("Notification System Frontend Tests", () => {
  it("dispatches toast notifications for quest enrollment activity", async () => {
    render(
      <NotificationProvider>
        <TestComponent />
        <ToastContainer />
      </NotificationProvider>
    )

    fireEvent.click(screen.getByText("Trigger Enrollment"))
    expect(await screen.findByText("New Quest Enrollment")).toBeDefined()
    expect(screen.getByText(/enrolled in "Rust Fundamentals"/i)).toBeDefined()
  })

  it("dispatches toast notifications for milestone proof submission", async () => {
    render(
      <NotificationProvider>
        <TestComponent />
        <ToastContainer />
      </NotificationProvider>
    )

    fireEvent.click(screen.getByText("Trigger Submission"))
    expect(await screen.findByText("Milestone Submitted")).toBeDefined()
    expect(screen.getByText(/is ready for review/i)).toBeDefined()
  })

  it("dispatches toast notifications for milestone verification with written feedback", async () => {
    render(
      <NotificationProvider>
        <TestComponent />
        <ToastContainer />
      </NotificationProvider>
    )

    fireEvent.click(screen.getByText("Trigger Verification"))
    expect(await screen.findByText("Milestone Verified!")).toBeDefined()
    expect(screen.getByText(/Excellent clean tests!/i)).toBeDefined()
  })

  it("dispatches toast notifications for deadline reminders", async () => {
    render(
      <NotificationProvider>
        <TestComponent />
        <ToastContainer />
      </NotificationProvider>
    )

    fireEvent.click(screen.getByText("Trigger Deadline"))
    expect(await screen.findByText("Deadline Approaching")).toBeDefined()
    expect(screen.getByText(/approaching in 2 days/i)).toBeDefined()
  })

  it("dispatches toast notifications for quest cancellation", async () => {
    render(
      <NotificationProvider>
        <TestComponent />
        <ToastContainer />
      </NotificationProvider>
    )

    fireEvent.click(screen.getByText("Trigger Cancellation"))
    expect(await screen.findByText("Quest Cancelled")).toBeDefined()
    expect(screen.getByText(/Audit requirement/i)).toBeDefined()
  })

  it("dispatches toast notifications for reward distributions", async () => {
    render(
      <NotificationProvider>
        <TestComponent />
        <ToastContainer />
      </NotificationProvider>
    )

    fireEvent.click(screen.getByText("Trigger Reward"))
    expect(await screen.findByText("Reward Distributed!")).toBeDefined()
    expect(screen.getByText(/Reward payout of 500 XLM/i)).toBeDefined()
  })

  it("renders all quest activity toggles in NotificationPreferencesCard", async () => {
    render(
      <NotificationProvider>
        <NotificationPreferencesCard />
      </NotificationProvider>
    )

    expect(screen.getByText("Toast Notifications")).toBeDefined()
    expect(screen.getByText("Email Alerts")).toBeDefined()
    expect(screen.getByText("In-App Notification Feed")).toBeDefined()
    expect(screen.getByText("Enrollment Activity")).toBeDefined()
    expect(screen.getByText("Milestone Submissions")).toBeDefined()
    expect(screen.getByText("Verification & Review Feedback")).toBeDefined()
    expect(screen.getByText("Reward Distribution & Escrow")).toBeDefined()
    expect(screen.getByText("Deadline Reminders")).toBeDefined()
    expect(screen.getByText("Quest Cancellation & Archival")).toBeDefined()
  })
})
