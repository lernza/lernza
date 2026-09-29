import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import {
  CertificateShareModal,
  generateLinkedInCertUrl,
  generateEmbedBadgeSnippet,
  CertificateShareData,
} from "./CertificateShareModal"
import { HelmetProvider } from "react-helmet-async"

describe("CertificateShareModal (Issue #1637)", () => {
  const mockCert: CertificateShareData = {
    questId: 42,
    questName: "Soroban Smart Contracts 101",
    issuer: "GBDEV7PX5J7GBLH3J7KSLQOEXAMPLENOTAREALKEY7777777777777777",
    recipient: "GRECIPIENTKEY1234567890EXAMPLENOTAREALKEY7777777777777777",
    completionDate: "2026-06-15T12:00:00.000Z",
    txHash: "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
  }

  beforeEach(() => {
    vi.clearAllMocks()
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    })
  })

  it("generates correctly formatted LinkedIn credential import URL", () => {
    const shareUrl = "https://lernza.com/quest/42?cert=GRECIPIENT"
    const linkedInUrl = generateLinkedInCertUrl(mockCert, shareUrl)

    expect(linkedInUrl).toContain("https://www.linkedin.com/profile/add")
    expect(linkedInUrl).toContain("startTask=CERTIFICATION_NAME")
    const decodedUrl = decodeURIComponent(linkedInUrl.replace(/\+/g, " "))
    expect(decodedUrl).toContain("Soroban Smart Contracts 101 — Completion Certificate")
    expect(linkedInUrl).toContain("organizationName=Lernza")
    expect(linkedInUrl).toContain("issueYear=2026")
    expect(linkedInUrl).toContain("issueMonth=6")
  })

  it("generates responsive HTML snippet for embeddable certificate badge", () => {
    const shareUrl = "https://lernza.com/quest/42?cert=GRECIPIENT"
    const snippet = generateEmbedBadgeSnippet(mockCert, shareUrl)

    expect(snippet).toContain(`<a href="${shareUrl}"`)
    expect(snippet).toContain("img src=")
    expect(snippet).toContain("Soroban Smart Contracts 101")
  })

  it("renders modal content including on-chain explorer link and allows copying shareable URL", () => {
    const onClose = vi.fn()

    render(
      <HelmetProvider>
        <CertificateShareModal isOpen={true} certificate={mockCert} onClose={onClose} />
      </HelmetProvider>
    )

    expect(screen.getByText("Share Certificate")).toBeInTheDocument()
    expect(screen.getByText("Soroban Smart Contracts 101")).toBeInTheDocument()
    expect(screen.getByText("Add to LinkedIn Profile")).toBeInTheDocument()

    const explorerLink = screen.getByText(/View On-Chain Verification/i)
    expect(explorerLink).toBeInTheDocument()
    expect(explorerLink.closest("a")).toHaveAttribute(
      "href",
      `https://stellar.expert/explorer/testnet/tx/${mockCert.txHash}`
    )

    const copyBtn = screen.getByRole("button", { name: /^Copy$/i })
    fireEvent.click(copyBtn)
    expect(navigator.clipboard.writeText).toHaveBeenCalled()
  })
})
