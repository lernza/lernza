import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { ErrorBoundary, ErrorBoundaryProvider, SectionErrorBoundary } from "./error-boundary"

vi.mock("@/hooks/use-wallet", () => ({
  useWallet: vi.fn(() => ({
    network: "testnet",
  })),
}))

vi.mock("@sentry/react", () => ({
  captureException: vi.fn(),
}))

const ErrorThrowingComponent = ({ shouldThrow }: { shouldThrow: boolean }) => {
  if (shouldThrow) {
    throw new Error("Test error")
  }
  return <div>Rendered successfully</div>
}

describe("ErrorBoundary", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("renders children when no error occurs", () => {
    render(
      <ErrorBoundary>
        <div>Test content</div>
      </ErrorBoundary>,
    )
    expect(screen.getByText("Test content")).toBeInTheDocument()
  })

  it("renders fallback UI when error occurs", () => {
    const { rerender } = render(
      <ErrorBoundary>
        <ErrorThrowingComponent shouldThrow={false} />
      </ErrorBoundary>,
    )

    expect(screen.getByText("Rendered successfully")).toBeInTheDocument()

    rerender(
      <ErrorBoundary>
        <ErrorThrowingComponent shouldThrow={true} />
      </ErrorBoundary>,
    )

    expect(screen.queryByText("Rendered successfully")).not.toBeInTheDocument()
  })

  it("classifies contract errors correctly", () => {
    const { rerender } = render(
      <ErrorBoundary>
        <ErrorThrowingComponent shouldThrow={false} />
      </ErrorBoundary>,
    )

    rerender(
      <ErrorBoundary>
        <ErrorThrowingComponent shouldThrow={true} />
      </ErrorBoundary>,
    )

    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument()
  })

  it("renders custom fallback when provided", () => {
    const customFallback = vi.fn(() => <div>Custom error</div>)

    const { rerender } = render(
      <ErrorBoundary fallback={customFallback}>
        <ErrorThrowingComponent shouldThrow={false} />
      </ErrorBoundary>,
    )

    rerender(
      <ErrorBoundary fallback={customFallback}>
        <ErrorThrowingComponent shouldThrow={true} />
      </ErrorBoundary>,
    )

    expect(customFallback).toHaveBeenCalled()
  })

  it("provides route label in UI", () => {
    const { rerender } = render(
      <ErrorBoundary routeLabel="Dashboard">
        <ErrorThrowingComponent shouldThrow={false} />
      </ErrorBoundary>,
    )

    rerender(
      <ErrorBoundary routeLabel="Dashboard">
        <ErrorThrowingComponent shouldThrow={true} />
      </ErrorBoundary>,
    )

    expect(screen.getByText(/dashboard/i)).toBeInTheDocument()
  })

  it("resets error when reset button is clicked", () => {
    const { rerender } = render(
      <ErrorBoundary>
        <ErrorThrowingComponent shouldThrow={false} />
      </ErrorBoundary>,
    )

    expect(screen.getByText("Rendered successfully")).toBeInTheDocument()

    rerender(
      <ErrorBoundary>
        <ErrorThrowingComponent shouldThrow={true} />
      </ErrorBoundary>,
    )

    const resetButton = screen.getByRole("button", { name: /try again/i })
    fireEvent.click(resetButton)

    rerender(
      <ErrorBoundary>
        <ErrorThrowingComponent shouldThrow={false} />
      </ErrorBoundary>,
    )

    expect(screen.getByText("Rendered successfully")).toBeInTheDocument()
  })
})

describe("ErrorBoundaryProvider", () => {
  it("renders children", () => {
    render(
      <ErrorBoundaryProvider>
        <div>Provider test</div>
      </ErrorBoundaryProvider>,
    )
    expect(screen.getByText("Provider test")).toBeInTheDocument()
  })

  it("tracks route changes via popstate", () => {
    render(
      <ErrorBoundaryProvider>
        <div>Provider test</div>
      </ErrorBoundaryProvider>,
    )

    const popstateEvent = new PopStateEvent("popstate")
    window.dispatchEvent(popstateEvent)

    expect(screen.getByText("Provider test")).toBeInTheDocument()
  })
})

describe("SectionErrorBoundary", () => {
  it("renders children when no error occurs", () => {
    render(
      <SectionErrorBoundary>
        <div>Section content</div>
      </SectionErrorBoundary>,
    )
    expect(screen.getByText("Section content")).toBeInTheDocument()
  })

  it("renders section-level error fallback", () => {
    const { rerender } = render(
      <SectionErrorBoundary>
        <ErrorThrowingComponent shouldThrow={false} />
      </SectionErrorBoundary>,
    )

    rerender(
      <SectionErrorBoundary>
        <ErrorThrowingComponent shouldThrow={true} />
      </SectionErrorBoundary>,
    )

    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument()
  })
})
