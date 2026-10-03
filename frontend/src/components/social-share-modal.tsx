import { useCallback, useRef } from "react"
import { createPortal } from "react-dom"
import { X, Link2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DiscordBrandIcon, XBrandIcon } from "@/components/brand-icons"
import { useScrollLock } from "@/hooks/use-scroll-lock"
import { useFocusTrap } from "@/hooks/use-focus-trap"
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
  const dialogRef = useRef<HTMLDivElement>(null)

  useScrollLock(isOpen)

  // Trap focus, autofocus the first control, close on Escape, restore focus
  // to the trigger that opened this modal.
  useFocusTrap(dialogRef, { isActive: isOpen, onEscape: onClose })

  const handleClose = useCallback(() => {
    onClose()
  }, [onClose])

  const baseUrl = config.url || (typeof window !== "undefined" ? window.location.href : "")

  const shareOnX = () => {
    const text = `${config.achievementText} on ${config.questName}! Check it out on Lernza: ${baseUrl}`
    const encoded = encodeURIComponent(text)
    window.open(`https://x.com/intent/tweet?text=${encoded}`, "x-share", "width=550,height=420")
  }

  const copyForDiscord = () => {
    const text = `**${config.title}**\n${config.description}\n${config.achievementText} on ${config.questName}!\n${baseUrl}`
    navigator.clipboard.writeText(text)
  }

  const copyToClipboard = () => {
    const shareText = `${config.achievementText} on ${config.questName}! ${baseUrl}`
    navigator.clipboard.writeText(shareText)
  }

  if (!isOpen) return null

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="absolute inset-0 bg-black/50" aria-hidden="true" />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="social-share-title"
        tabIndex={-1}
        className="border-border bg-background animate-scale-in relative z-10 w-full max-w-md rounded-lg border p-6 shadow-2xl"
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 id="social-share-title" className="text-lg font-semibold">
              Share Your Achievement
            </h2>
            <button
              type="button"
              onClick={handleClose}
              className="text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
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
              onClick={shareOnX}
              className={cn(
                "w-full justify-start gap-2",
                "bg-[#1DA1F2] text-white hover:bg-[#1aa1e0]"
              )}
            >
              <XBrandIcon className="h-[18px] w-[18px]" />
              Share on X
            </Button>

            <Button
              onClick={copyForDiscord}
              className={cn(
                "w-full justify-start gap-2",
                "bg-[#5865F2] text-white hover:bg-[#4752c4]"
              )}
            >
              <DiscordBrandIcon className="h-[18px] w-[18px]" />
              Copy for Discord
            </Button>

            <Button
              onClick={copyToClipboard}
              variant="outline"
              className="w-full justify-start gap-2"
            >
              <Link2 size={18} />
              Copy to Clipboard
            </Button>
          </div>

          <div className="text-muted-foreground text-center text-xs">
            Share your quest completion and inspire others to learn
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}
