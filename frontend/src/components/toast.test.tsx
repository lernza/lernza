import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { ToastContainer } from "./toast"
import { useToast } from "@/hooks/use-toast"

vi.mock("@/hooks/use-toast", () => ({
  useToast: vi.fn(),
}))

const mockUseToast = vi.mocked(useToast)

describe("ToastContainer", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("renders empty container when no toasts", () => {
    mockUseToast.mockReturnValue({
      toasts: [],
      addToast: vi.fn(),
      removeToast: vi.fn(),
    })

    const { container } = render(<ToastContainer />)
    expect(container.firstChild).toBeEmptyDOMElement()
  })

  it("renders all toasts", () => {
    mockUseToast.mockReturnValue({
      toasts: [
        { id: "1", message: "Success!", type: "success" },
        { id: "2", message: "Warning", type: "warning" },
      ],
      addToast: vi.fn(),
      removeToast: vi.fn(),
    })

    render(<ToastContainer />)
    expect(screen.getByText("Success!")).toBeInTheDocument()
    expect(screen.getByText("Warning")).toBeInTheDocument()
  })

  it("removes toast when close button clicked", () => {
    const removeToast = vi.fn()
    mockUseToast.mockReturnValue({
      toasts: [{ id: "1", message: "Test", type: "success" }],
      addToast: vi.fn(),
      removeToast,
    })

    render(<ToastContainer />)
    const closeButton = screen.getByRole("button")
    fireEvent.click(closeButton)
    expect(removeToast).toHaveBeenCalledWith("1")
  })

  it("auto-removes success toasts after delay", async () => {
    const removeToast = vi.fn()
    mockUseToast.mockReturnValue({
      toasts: [{ id: "1", message: "Success", type: "success" }],
      addToast: vi.fn(),
      removeToast,
    })

    vi.useFakeTimers()
    render(<ToastContainer />)

    vi.advanceTimersByTime(5000)
    expect(removeToast).toHaveBeenCalledWith("1")

    vi.useRealTimers()
  })

  it("does not auto-remove error toasts", () => {
    const removeToast = vi.fn()
    mockUseToast.mockReturnValue({
      toasts: [{ id: "1", message: "Error", type: "error" }],
      addToast: vi.fn(),
      removeToast,
    })

    vi.useFakeTimers()
    render(<ToastContainer />)

    vi.advanceTimersByTime(5000)
    expect(removeToast).not.toHaveBeenCalled()

    vi.useRealTimers()
  })

  it("applies correct styles for different toast types", () => {
    mockUseToast.mockReturnValue({
      toasts: [
        { id: "1", message: "Success", type: "success" },
        { id: "2", message: "Error", type: "error" },
        { id: "3", message: "Info", type: "info" },
      ],
      addToast: vi.fn(),
      removeToast: vi.fn(),
    })

    render(<ToastContainer />)

    const successToast = screen.getByText("Success").closest("div")
    const errorToast = screen.getByText("Error").closest("div")

    expect(successToast).toHaveClass("bg-green-100")
    expect(errorToast).toHaveClass("bg-red-100")
  })

  it("handles multiple toasts correctly", () => {
    mockUseToast.mockReturnValue({
      toasts: [
        { id: "1", message: "First", type: "success" },
        { id: "2", message: "Second", type: "warning" },
        { id: "3", message: "Third", type: "error" },
      ],
      addToast: vi.fn(),
      removeToast: vi.fn(),
    })

    render(<ToastContainer />)

    expect(screen.getByText("First")).toBeInTheDocument()
    expect(screen.getByText("Second")).toBeInTheDocument()
    expect(screen.getByText("Third")).toBeInTheDocument()
  })

  it("updates toast content when props change", () => {
    const { rerender } = render(<ToastContainer />)

    mockUseToast.mockReturnValue({
      toasts: [{ id: "1", message: "First message", type: "success" }],
      addToast: vi.fn(),
      removeToast: vi.fn(),
    })

    rerender(<ToastContainer />)
    expect(screen.getByText("First message")).toBeInTheDocument()

    mockUseToast.mockReturnValue({
      toasts: [{ id: "1", message: "Updated message", type: "success" }],
      addToast: vi.fn(),
      removeToast: vi.fn(),
    })

    rerender(<ToastContainer />)
    expect(screen.getByText("Updated message")).toBeInTheDocument()
  })
})
