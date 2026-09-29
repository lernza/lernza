import { Award, Calendar, Layers, Download, Copy, Check, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
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

export interface CertificateCardProps {
  certificateId: number
  recipient: string
  questName: string
  questCategory: string
  milestoneCount: number
  completionDate: number
  issuer: string
  onDownload?: () => void
  onCopyLink?: () => void
  isCopied?: boolean
}

function formatDate(unixSeconds: number): string {
  if (!unixSeconds) return "—"
  return new Date(unixSeconds * 1000).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  })
}

export function CertificateCard({
  certificateId,
  recipient,
  questName,
  questCategory,
  milestoneCount,
  completionDate,
  issuer,
  onDownload,
  onCopyLink,
  isCopied = false,
}: CertificateCardProps) {
  const detailRows = [
    { icon: <Award className="h-4 w-4" />, label: "Quest", value: questName },
    { icon: <Layers className="h-4 w-4" />, label: "Category", value: questCategory },
    { icon: <Calendar className="h-4 w-4" />, label: "Completed", value: formatDate(completionDate) },
    { icon: <Layers className="h-4 w-4" />, label: "Milestones", value: String(milestoneCount) },
    { icon: <ExternalLink className="h-4 w-4" />, label: "Issuer", value: shortenAddress(issuer) },
    { icon: <ExternalLink className="h-4 w-4" />, label: "Recipient", value: shortenAddress(recipient) },
  ]

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold">Certificate of Completion</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Verified on-chain via the Lernza certificate contract.
        </p>
      </div>

      {/* Certificate template */}
      <div className="bg-gradient-to-br from-indigo-500 via-purple-500 to-fuchsia-500 rounded-2xl p-8 text-white shadow-xl">
        <div className="flex items-center gap-3">
          <Award className="h-10 w-10" />
          <div>
            <p className="text-xs uppercase tracking-widest opacity-80">Lernza</p>
            <p className="text-lg font-semibold">Certificate of Completion</p>
          </div>
        </div>
        <p className="mt-8 text-sm opacity-90">This certifies that</p>
        <p className="text-2xl font-bold">{shortenAddress(recipient)}</p>
        <p className="mt-6 text-sm opacity-90">has completed the quest</p>
        <p className="text-3xl font-extrabold">{questName}</p>
        <div className="mt-8 grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="opacity-80">Category</p>
            <p className="font-medium">{questCategory}</p>
          </div>
          <div>
            <p className="opacity-80">Milestones</p>
            <p className="font-medium">{milestoneCount}</p>
          </div>
          <div>
            <p className="opacity-80">Completed</p>
            <p className="font-medium">{formatDate(completionDate)}</p>
          </div>
          <div>
            <p className="opacity-80">Issuer</p>
            <p className="font-medium">{shortenAddress(issuer)}</p>
          </div>
        </div>
        <p className="mt-8 text-xs opacity-70">Certificate ID #{certificateId}</p>
      </div>

      <Card className="mt-6">
        <CardContent className="space-y-3 p-6">
          {detailRows.map(row => (
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
        {onDownload && (
          <Button onClick={onDownload} className="gap-2">
            <Download className="h-4 w-4" />
            Download image
          </Button>
        )}
        {onCopyLink && (
          <Button variant="outline" onClick={onCopyLink} className="gap-2">
            {isCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {isCopied ? "Copied" : "Copy link"}
          </Button>
        )}
        <Button variant="outline" className="gap-2">
          <TwitterIcon className="h-4 w-4" />
          Share on X
        </Button>
        <Button variant="outline" className="gap-2">
          <LinkedinIcon className="h-4 w-4" />
          Share on LinkedIn
        </Button>
      </div>
    </div>
  )
}
