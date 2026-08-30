import { MapPin, Link2, Tag, Copy, Check, Eye, Lock, ShieldCheck } from "lucide-react"
import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { ReputationBadge } from "@/components/reputation-badge"
import { WalletAvatar } from "@/components/wallet-avatar"
import type { ReputationSummary } from "@/lib/reputation"
import type { ProfileMetadata } from "@/lib/profile-types"
import { PrivacyLevel as PL } from "@/lib/profile-types"
import type { ProfileFieldPrivacy } from "@/lib/profile-types"

interface ProfileHeaderDisplayProps {
  walletAddress: string
  metadata: Partial<ProfileMetadata>
  fieldPrivacy?: ProfileFieldPrivacy
  viewerIsOwner: boolean
  displayName?: string
  roleLabel: string
  roleVariant: "default" | "success" | "secondary" | "outline" | "destructive"
  totalEarned?: bigint | null
  formattedEarnings?: string
  earningsLoading?: boolean
  reputation?: ReputationSummary
  onEditProfile?: () => void
}

function PrivacyIndicator({ level, field }: { level: string; field: string }) {
  const isPrivate = level === PL.Private
  const isConnections = level === PL.Connections
  if (isPrivate) {
    return (
      <span
        className="text-muted-foreground inline-flex items-center gap-1 text-[10px] font-bold"
        title={`${field}: Private (only you can see this)`}
      >
        <Lock className="h-2.5 w-2.5" />
        Private
      </span>
    )
  }
  if (isConnections) {
    return (
      <span
        className="text-muted-foreground inline-flex items-center gap-1 text-[10px] font-bold"
        title={`${field}: Connections only`}
      >
        <ShieldCheck className="h-2.5 w-2.5" />
        Connections
      </span>
    )
  }
  return null
}

export function ProfileHeaderDisplay({
  walletAddress,
  metadata,
  fieldPrivacy,
  viewerIsOwner,
  displayName,
  roleLabel,
  roleVariant,
  formattedEarnings,
  earningsLoading,
  reputation,
  onEditProfile,
}: ProfileHeaderDisplayProps) {
  const [copied, setCopied] = useState(false)
  const hasAvatar = !!metadata.avatarUrl

  const handleCopy = () => {
    if (walletAddress) {
      navigator.clipboard.writeText(walletAddress)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const effectiveName = metadata.displayName?.trim() || displayName || "Learner"

  return (
    <div className="bg-accent border-border overflow-hidden border shadow-lg">
      <div className="bg-diagonal-lines pointer-events-none absolute inset-0 opacity-20" />

      <div className="relative h-20 sm:h-28">
        <div className="bg-foreground/5 border-foreground/10 animate-float absolute top-3 right-6 h-10 w-10 rotate-12 border-2" />
        <div className="bg-foreground/5 border-foreground/10 animate-float absolute right-24 bottom-2 h-6 w-6 -rotate-6 border-2" />
      </div>

      <div className="bg-card text-card-foreground border-border relative border-t px-6 py-5">
        <div className="-mt-14 flex flex-col items-start gap-6 sm:-mt-16 sm:flex-row sm:items-center">
          <div className="relative">
            {hasAvatar ? (
              <div className="border-border h-20 w-20 shrink-0 overflow-hidden border shadow-md">
                <img
                  src={metadata.avatarUrl}
                  alt={effectiveName}
                  className="h-full w-full object-cover"
                  onError={e => {
                    ;(e.target as HTMLImageElement).style.display = "none"
                  }}
                />
              </div>
            ) : (
              <WalletAvatar address={walletAddress || ""} />
            )}
            {!viewerIsOwner && (
              <div className="border-border bg-background absolute -right-1 -bottom-1 flex h-6 w-6 items-center justify-center border shadow-sm">
                <Eye className="text-muted-foreground h-3 w-3" aria-label="Public view" />
              </div>
            )}
          </div>

          <div className="mt-2 min-w-0 flex-1 sm:mt-6">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="max-w-[300px] truncate text-xl font-semibold">{effectiveName}</h2>
              {!metadata.displayName && viewerIsOwner && (
                <Badge variant="outline" className="gap-1 border text-[10px] font-bold">
                  <Lock className="h-2.5 w-2.5" />
                  No display name set
                </Badge>
              )}
              <Badge variant={roleVariant} className="gap-1">
                {roleLabel}
              </Badge>
              {reputation && <ReputationBadge summary={reputation} showScore={true} size="sm" />}
            </div>

            <div className="mt-1 flex flex-wrap items-center gap-2">
              <p
                className="text-muted-foreground max-w-[140px] truncate font-mono text-sm font-bold sm:max-w-xs"
                title={walletAddress}
              >
                {walletAddress}
              </p>
              <button
                onClick={handleCopy}
                className="border-border bg-card neo-press hover:bg-secondary flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center border-2 shadow-sm"
                aria-label="Copy address"
              >
                {copied ? <Check className="text-success h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </button>
              {fieldPrivacy && viewerIsOwner && (
                <PrivacyIndicator level={fieldPrivacy.displayName} field="Display name" />
              )}
            </div>

            {metadata.bio && (
              <div className="mt-3">
                <p className="text-muted-foreground max-w-2xl text-sm leading-relaxed whitespace-pre-wrap">
                  {metadata.bio}
                </p>
                {fieldPrivacy && viewerIsOwner && (
                  <div className="mt-1">
                    <PrivacyIndicator level={fieldPrivacy.bio} field="Bio" />
                  </div>
                )}
              </div>
            )}

            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
              {metadata.location && (
                <div className="flex items-center gap-1.5">
                  <MapPin className="text-muted-foreground h-3.5 w-3.5" />
                  <span className="text-muted-foreground text-xs font-bold">
                    {metadata.location}
                  </span>
                  {fieldPrivacy && viewerIsOwner && (
                    <PrivacyIndicator level={fieldPrivacy.location} field="Location" />
                  )}
                </div>
              )}

              {metadata.tags && metadata.tags.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5">
                  <Tag className="text-muted-foreground h-3.5 w-3.5" />
                  {metadata.tags.slice(0, 5).map(tag => (
                    <Badge
                      key={tag}
                      variant="secondary"
                      className="border text-[10px] font-bold shadow-sm"
                    >
                      {tag}
                    </Badge>
                  ))}
                  {metadata.tags.length > 5 && (
                    <Badge variant="outline" className="border text-[10px] font-bold">
                      +{metadata.tags.length - 5} more
                    </Badge>
                  )}
                  {fieldPrivacy && viewerIsOwner && (
                    <PrivacyIndicator level={fieldPrivacy.tags} field="Tags" />
                  )}
                </div>
              )}
            </div>

            {metadata.links && metadata.links.length > 0 && (
              <div className="mt-3 space-y-1.5">
                <div className="flex items-center gap-1.5">
                  <Link2 className="text-muted-foreground h-3.5 w-3.5" />
                  <div className="flex flex-wrap gap-2">
                    {metadata.links.map(link => (
                      <a
                        key={link.id}
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-accent inline-flex items-center gap-1 text-xs font-bold underline underline-offset-2 transition-opacity hover:opacity-80"
                      >
                        {link.label}
                      </a>
                    ))}
                  </div>
                </div>
                {fieldPrivacy && viewerIsOwner && (
                  <PrivacyIndicator level={fieldPrivacy.links} field="Links" />
                )}
              </div>
            )}
          </div>

          <div className="flex flex-col items-end gap-2 sm:mt-6">
            {viewerIsOwner && onEditProfile && (
              <button
                onClick={onEditProfile}
                className="border-border bg-accent text-accent-foreground hover:bg-accent/80 border-2 px-4 py-2 text-xs font-semibold shadow-md transition-colors"
              >
                Edit Profile
              </button>
            )}
            {formattedEarnings && viewerIsOwner && (
              <div className="bg-accent border-border border-2 px-5 py-3 shadow-md">
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-semibold tabular-nums">{formattedEarnings}</span>
                </div>
                <p className="text-xs font-bold">
                  {earningsLoading ? "Loading on-chain earnings" : "USDC earned on-chain"}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
