import { Award, Calendar, Layers, Download, Copy, Check, Twitter, Linkedin, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { shortenAddress } from "@/lib/utils"

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
          <Twitter className="h-4 w-4" />
          Share on X
        </Button>
        <Button variant="outline" className="gap-2">
          <Linkedin className="h-4 w-4" />
          Share on LinkedIn
        </Button>
      </div>
    </div>
  )
}
