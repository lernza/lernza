import { useState, useRef, useEffect } from "react"
import { X, Share2, ExternalLink, Code, Copy, Check, ShieldCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PageMetadata } from "@/components/PageMetadata"

export interface CertificateShareData {
  questId: number
  questName: string
  issuer: string
  recipient: string
  completionDate: string | number
  contractId?: string
  txHash?: string
}

interface CertificateShareModalProps {
  isOpen: boolean
  certificate: CertificateShareData
  onClose: () => void
}

export function generateLinkedInCertUrl(cert: CertificateShareData, shareUrl: string): string {
  const dateObj = new Date(cert.completionDate)
  const issueYear = isNaN(dateObj.getFullYear()) ? new Date().getFullYear() : dateObj.getFullYear()
  const issueMonth = isNaN(dateObj.getMonth()) ? new Date().getMonth() + 1 : dateObj.getMonth() + 1

  const params = new URLSearchParams({
    startTask: "CERTIFICATION_NAME",
    name: `${cert.questName} — Completion Certificate`,
    organizationName: "Lernza",
    issueYear: issueYear.toString(),
    issueMonth: issueMonth.toString(),
    certUrl: shareUrl,
    certId: `lernza-quest-${cert.questId}-${cert.recipient.slice(0, 8)}`,
  })

  return `https://www.linkedin.com/profile/add?${params.toString()}`
}

export function generateEmbedBadgeSnippet(cert: CertificateShareData, shareUrl: string): string {
  const siteUrl = typeof window !== "undefined" ? window.location.origin : "https://lernza.com"
  const badgeImgUrl = `${siteUrl}/badges/verified-badge.svg`
  return `<a href="${shareUrl}" target="_blank" rel="noopener noreferrer" title="Verified Lernza Quest Completion Certificate">\n  <img src="${badgeImgUrl}" alt="Lernza Certificate: ${cert.questName}" width="240" height="72" />\n</a>`
}

export function CertificateShareModal({
  isOpen,
  certificate,
  onClose,
}: CertificateShareModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [copiedLink, setCopiedLink] = useState(false)
  const [copiedSnippet, setCopiedSnippet] = useState(false)

  const origin = typeof window !== "undefined" ? window.location.origin : "https://lernza.com"
  const shareUrl = `${origin}/quest/${certificate.questId}?cert=${encodeURIComponent(certificate.recipient)}`
  const verificationUrl = certificate.txHash
    ? `https://stellar.expert/explorer/testnet/tx/${certificate.txHash}`
    : certificate.contractId
      ? `https://stellar.expert/explorer/testnet/contract/${certificate.contractId}`
      : `https://stellar.expert/explorer/testnet/search?term=${encodeURIComponent(certificate.recipient)}`

  const linkedInUrl = generateLinkedInCertUrl(certificate, shareUrl)
  const embedSnippet = generateEmbedBadgeSnippet(certificate, shareUrl)

  const formattedDate = new Date(certificate.completionDate).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  })

  useEffect(() => {
    if (isOpen) {
      if (typeof dialogRef.current?.showModal === "function") {
        dialogRef.current.showModal()
      }
    } else {
      if (typeof dialogRef.current?.close === "function") {
        dialogRef.current.close()
      }
    }
  }, [isOpen])

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl)
    setCopiedLink(true)
    setTimeout(() => setCopiedLink(false), 2000)
  }

  const handleCopySnippet = () => {
    navigator.clipboard.writeText(embedSnippet)
    setCopiedSnippet(true)
    setTimeout(() => setCopiedSnippet(false), 2000)
  }

  return (
    <>
      {isOpen && (
        <PageMetadata
          title={`${certificate.questName} Certificate — Lernza`}
          description={`Verified completion of ${certificate.questName} issued by ${certificate.issuer} on ${formattedDate}.`}
          canonicalUrl={shareUrl}
        />
      )}

      <dialog
        ref={dialogRef}
        open={isOpen}
        onClose={onClose}
        className="fixed inset-0 z-50 m-auto w-full max-w-lg rounded-xl border border-border bg-card p-6 text-card-foreground shadow-2xl backdrop:bg-black/60 focus:outline-none"
      >
        <div className="flex items-center justify-between pb-4 border-b border-border">
          <div className="flex items-center gap-2 font-bold text-lg">
            <Share2 className="h-5 w-5 text-primary" />
            Share Certificate
          </div>
          <button
            onClick={onClose}
            aria-label="Close dialog"
            className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-4 space-y-5">
          {/* Certificate Overview */}
          <div className="rounded-lg bg-muted/60 p-3.5 border border-border">
            <div className="text-xs uppercase font-bold tracking-wider text-muted-foreground">
              Quest Certificate
            </div>
            <div className="mt-1 text-base font-semibold">{certificate.questName}</div>
            <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span>Issuer: {certificate.issuer.slice(0, 6)}...{certificate.issuer.slice(-4)}</span>
              <span>Issued: {formattedDate}</span>
            </div>
          </div>

          {/* Shareable Verification Link */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">Shareable Certificate URL</label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={shareUrl}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs font-mono text-muted-foreground focus:outline-none"
              />
              <Button size="sm" onClick={handleCopyLink} className="gap-1.5 shrink-0">
                {copiedLink ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copiedLink ? "Copied" : "Copy"}
              </Button>
            </div>
            <div className="pt-1">
              <a
                href={verificationUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline font-medium"
              >
                <ShieldCheck className="h-3.5 w-3.5" />
                View On-Chain Verification (Stellar Explorer)
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>

          {/* LinkedIn Credential Import */}
          <div className="space-y-2 rounded-lg border border-border p-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <svg
                  className="h-4 w-4 fill-[#0077b5]"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z" />
                </svg>
                <span className="text-xs font-semibold">Add to LinkedIn Profile</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 text-xs"
                onClick={() => window.open(linkedInUrl, "_blank", "noopener,noreferrer")}
              >
                Import Credential
                <ExternalLink className="h-3 w-3" />
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Directly imports quest name, issuance date, organization, and verification link to your LinkedIn certifications.
            </p>
          </div>

          {/* Embeddable Certificate Badge */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-1.5 text-xs font-semibold">
                <Code className="h-4 w-4 text-primary" />
                Embeddable Certificate Badge (HTML Snippet)
              </label>
              <Button variant="ghost" size="sm" onClick={handleCopySnippet} className="h-7 gap-1 text-xs">
                {copiedSnippet ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                {copiedSnippet ? "Copied HTML" : "Copy Snippet"}
              </Button>
            </div>
            <textarea
              readOnly
              rows={3}
              value={embedSnippet}
              className="w-full rounded-md border border-input bg-background p-2 font-mono text-[11px] text-muted-foreground focus:outline-none"
            />
          </div>
        </div>
      </dialog>
    </>
  )
}
