import { useCallback, useEffect, useRef, useState } from "react"
import { Award, Calendar, Layers, Download, Copy, Check, ExternalLink, Loader2, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { certificateClient, type CertificateMetadata } from "@/lib/contracts/certificate"
import { shortenAddress } from "@/lib/utils"

function TwitterIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  )
}

function LinkedinIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 10.9v8.37H9.2V10.9H6.46M7.83 6.2a1.66 1.66 0 0 0-1.66 1.66c0 .92.74 1.66 1.66 1.66.92 0 1.66-.74 1.66-1.66 0-.92-.74-1.66-1.66-1.66Z" />
    </svg>
  )
}

function formatDate(unixSeconds: number): string {
  if (!unixSeconds) return "—"
  return new Date(unixSeconds * 1000).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  })
}

function shareUrl(certificateId: number): string {
  if (typeof window === "undefined") return ""
  return `${window.location.origin}/certificate/${certificateId}`
}

export function CertificateView({ certificateId }: { certificateId: number }) {
  const [metadata, setMetadata] = useState<CertificateMetadata | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const templateRef = useRef<HTMLDivElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    let active = true
    setLoading(true)
    setError(null)
    certificateClient
      .getCertificateMetadata(certificateId)
      .then((data) => {
        if (!active) return
        setMetadata(data)
        if (!data) setError("We couldn't find a certificate with that ID.")
      })
      .catch((e) => {
        if (!active) return
        setError(e instanceof Error ? e.message : "Failed to load certificate.")
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [certificateId])

  const copyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(shareUrl(certificateId))
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      /* clipboard unavailable */
    }
  }, [certificateId])

  const downloadImage = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas || !metadata) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const w = canvas.width
    const h = canvas.height
    const gradient = ctx.createLinearGradient(0, 0, w, h)
    gradient.addColorStop(0, "#6366f1")
    gradient.addColorStop(0.5, "#a855f7")
    gradient.addColorStop(1, "#d946ef")
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, w, h)

    ctx.fillStyle = "#ffffff"
    ctx.font = "bold 34px sans-serif"
    ctx.fillText("Lernza Certificate of Completion", 48, 80)

    ctx.font = "20px sans-serif"
    ctx.fillText(`Recipient: ${shortenAddress(metadata.recipient)}`, 48, 160)
    ctx.fillText(`Quest: ${metadata.questName}`, 48, 210)
    ctx.fillText(`Category: ${metadata.questCategory}`, 48, 260)
    ctx.fillText(`Milestones: ${metadata.milestoneCount}`, 48, 310)
    ctx.fillText(`Completed: ${formatDate(metadata.completionDate)}`, 48, 360)
    ctx.fillText(`Issuer: ${shortenAddress(metadata.issuer)}`, 48, 410)
    ctx.font = "16px sans-serif"
    ctx.fillText(`Certificate ID #${certificateId}`, 48, h - 40)

    const link = document.createElement("a")
    link.download = `lernza-certificate-${certificateId}.png`
    link.href = canvas.toDataURL("image/png")
    link.click()
  }, [certificateId, metadata])

  const tweetUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
    `I just earned a Lernza certificate: ${metadata?.questName ?? "a quest"}!`,
  )}&url=${encodeURIComponent(shareUrl(certificateId))}`
  const linkedinUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(
    shareUrl(certificateId),
  )}`

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (error || !metadata) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <AlertCircle className="text-destructive mx-auto mb-4 h-10 w-10" />
        <h1 className="mb-2 text-xl font-semibold">Certificate not available</h1>
        <p className="text-muted-foreground text-sm">{error ?? "Unknown error."}</p>
      </div>
    )
  }

  const detailRows = [
    { icon: <Award className="h-4 w-4" />, label: "Quest", value: metadata.questName },
    { icon: <Layers className="h-4 w-4" />, label: "Category", value: metadata.questCategory },
    { icon: <Calendar className="h-4 w-4" />, label: "Completed", value: formatDate(metadata.completionDate) },
    { icon: <Layers className="h-4 w-4" />, label: "Milestones", value: String(metadata.milestoneCount) },
    { icon: <ExternalLink className="h-4 w-4" />, label: "Issuer", value: shortenAddress(metadata.issuer) },
    { icon: <ExternalLink className="h-4 w-4" />, label: "Recipient", value: shortenAddress(metadata.recipient) },
  ]

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold">Certificate of Completion</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Verified on-chain via the Lernza certificate contract.
        </p>
      </div>

      {/* Certificate template — also used as the downloadable image source. */}
      <div
        ref={templateRef}
        className="bg-gradient-to-br from-indigo-500 via-purple-500 to-fuchsia-500 rounded-2xl p-8 text-white shadow-xl"
      >
        <div className="flex items-center gap-3">
          <Award className="h-10 w-10" />
          <div>
            <p className="text-xs uppercase tracking-widest opacity-80">Lernza</p>
            <p className="text-lg font-semibold">Certificate of Completion</p>
          </div>
        </div>
        <p className="mt-8 text-sm opacity-90">This certifies that</p>
        <p className="text-2xl font-bold">{shortenAddress(metadata.recipient)}</p>
        <p className="mt-6 text-sm opacity-90">has completed the quest</p>
        <p className="text-3xl font-extrabold">{metadata.questName}</p>
        <div className="mt-8 grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="opacity-80">Category</p>
            <p className="font-medium">{metadata.questCategory}</p>
          </div>
          <div>
            <p className="opacity-80">Milestones</p>
            <p className="font-medium">{metadata.milestoneCount}</p>
          </div>
          <div>
            <p className="opacity-80">Completed</p>
            <p className="font-medium">{formatDate(metadata.completionDate)}</p>
          </div>
          <div>
            <p className="opacity-80">Issuer</p>
            <p className="font-medium">{shortenAddress(metadata.issuer)}</p>
          </div>
        </div>
        <p className="mt-8 text-xs opacity-70">Certificate ID #{certificateId}</p>
      </div>

      <Card className="mt-8">
        <CardContent className="space-y-3 p-6">
          {detailRows.map((row) => (
            <div key={row.label} className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground flex items-center gap-2">
                {row.icon}
                {row.label}
              </span>
              <span className="font-medium">{row.value}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <Button onClick={downloadImage} className="gap-2">
          <Download className="h-4 w-4" />
          Download image
        </Button>
        <Button variant="outline" onClick={copyLink} className="gap-2">
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          {copied ? "Copied" : "Copy link"}
        </Button>
        <a href={tweetUrl} target="_blank" rel="noopener noreferrer">
          <Button variant="outline" className="gap-2">
            <TwitterIcon className="h-4 w-4" />
            Share on X
          </Button>
        </a>
        <a href={linkedinUrl} target="_blank" rel="noopener noreferrer">
          <Button variant="outline" className="gap-2">
            <LinkedinIcon className="h-4 w-4" />
            Share on LinkedIn
          </Button>
        </a>
      </div>

      {/* Hidden canvas used to render the downloadable certificate image. */}
      <canvas ref={canvasRef} className="hidden" width={800} height={480} aria-hidden />
    </div>
  )
}
