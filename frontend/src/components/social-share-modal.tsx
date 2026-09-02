import { useEffect, useRef } from "react"
import { X, Share2, MessageCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export interface ShareConfig {
  title: string
  description: string
  questName: string
  achievementText: string
  url?: string
}

interface SocialShareModalProps {
  isOpen: boolean
  config: ShareConfig
  onClose: () => void
}

export function SocialShareModal({ isOpen, config, onClose }: SocialShareModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    if (isOpen) {
      dialogRef.current?.showModal()
    } else {
      dialogRef.current?.close()
    }
  }, [isOpen])

  const handleClose = () => {
    dialogRef.current?.close()
    onClose()
  }

  const baseUrl = config.url || typeof window !== "undefined" ? window.location.href : ""

  const shareOnTwitter = () => {
    const text = `${config.achievementText} on ${config.questName}! Check it out on Lernza: ${baseUrl}`
    const encoded = encodeURIComponent(text)
    window.open(
      `https://twitter.com/intent/tweet?text=${encoded}`,
      "twitter-share",
      "width=550,height=420"
    )
  }

  const shareOnDiscord = () => {
    const text = `**${config.title}**\n${config.description}\n${config.achievementText} on ${config.questName}!\n${baseUrl}`
    navigator.clipboard.writeText(text)
  }

  const copyToClipboard = () => {
    const shareText = `${config.achievementText} on ${config.questName}! ${baseUrl}`
    navigator.clipboard.writeText(shareText)
  }

  return (
    <dialog
      ref={dialogRef}
      className="border-border bg-background rounded-lg border backdrop:bg-black/50"
      onClose={handleClose}
    >
      <div className="w-full max-w-md space-y-4 p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Share Your Achievement</h2>
          <button
            onClick={handleClose}
            className="text-muted-foreground hover:text-foreground"
            aria-label="Close dialog"
          >
            <X size={20} />
          </button>
        </div>

        <div className="bg-muted space-y-2 rounded-md p-3">
          <p className="text-sm font-medium">{config.title}</p>
          <p className="text-muted-foreground text-sm">{config.achievementText}</p>
        </div>

        <div className="space-y-2">
          <Button
            onClick={shareOnTwitter}
            className={cn(
              "w-full justify-start gap-2",
              "bg-[#1DA1F2] text-white hover:bg-[#1a91da]"
            )}
          >
            <Share2 size={18} />
            Share on Twitter / X
          </Button>

          <Button
            onClick={shareOnDiscord}
            className={cn(
              "w-full justify-start gap-2",
              "bg-[#5865F2] text-white hover:bg-[#4752c4]"
            )}
          >
            <MessageCircle size={18} />
            Copy for Discord
          </Button>

          <Button
            onClick={copyToClipboard}
            variant="outline"
            className="w-full justify-start gap-2"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <line x1="9" y1="9" x2="15" y2="9" />
              <line x1="9" y1="15" x2="15" y2="15" />
            </svg>
            Copy to Clipboard
          </Button>
        </div>

        <div className="text-muted-foreground text-center text-xs">
          Share your quest completion and inspire others to learn
        </div>
      </div>
    </dialog>
  )
}
