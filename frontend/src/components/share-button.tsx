import { useState, useRef, useEffect, useCallback } from "react"
import { createPortal } from "react-dom"
import { Share2, Link, X as XClose, Copy, Check } from "lucide-react"
import { cn } from "@/lib/utils"

function XIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  )
}

function DiscordIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
    </svg>
  )
}

/**
 * navigator.share now exists on desktop Chrome too, so checking for its mere
 * presence would suppress the dropdown on desktop. Gate on coarse pointer
 * (touch/mobile) so desktop users always get the dropdown panel.
 */
function isMobileWithShareApi(): boolean {
  if (typeof navigator === "undefined" || !navigator.share) return false
  return window.matchMedia("(pointer: coarse)").matches
}

interface DropdownPosition {
  top: number
  right: number
}

interface ShareButtonProps {
  questId: number
  questName: string
  onToast: (message: string, type?: "success" | "error" | "info") => void
  compact?: boolean
}

export function ShareButton({ questId, questName, onToast, compact = false }: ShareButtonProps) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState<DropdownPosition>({ top: 0, right: 0 })
  const [copied, setCopied] = useState(false)
  const [discordCopied, setDiscordCopied] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  const questUrl = `${window.location.origin}/quest/${questId}`
  // Spec: em dash (—) between quest name and URL
  const xText = `Check out this quest on @lernza: ${questName} — ${questUrl}`
  const discordText = `**Check out this quest on Lernza!**\n📚 **${questName}**\n🔗 ${questUrl}`

  // Calculate dropdown position from trigger bounds
  const updatePos = useCallback(() => {
    if (!triggerRef.current) return
    const rect = triggerRef.current.getBoundingClientRect()
    setPos({
      top: rect.bottom + window.scrollY + 8,
      right: window.innerWidth - rect.right,
    })
  }, [])

  const handleOpen = () => {
    updatePos()
    setOpen((v) => !v)
  }

  // Reposition on scroll/resize while open
  useEffect(() => {
    if (!open) return
    window.addEventListener("scroll", updatePos, true)
    window.addEventListener("resize", updatePos)
    return () => {
      window.removeEventListener("scroll", updatePos, true)
      window.removeEventListener("resize", updatePos)
    }
  }, [open, updatePos])

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (
        panelRef.current?.contains(e.target as Node) ||
        triggerRef.current?.contains(e.target as Node)
      ) return
      setOpen(false)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [open])

  // Close on Escape
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false)
    }
    document.addEventListener("keydown", handler)
    return () => document.removeEventListener("keydown", handler)
  }, [open])

  // Web Share API — mobile native sheet
  const handleNativeShare = async () => {
    try {
      await navigator.share({
        title: questName,
        text: `Check out this quest on Lernza: ${questName}`,
        url: questUrl,
      })
    } catch {
      // User cancelled or share interrupted — no action needed
    }
  }

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(questUrl)
      setCopied(true)
      onToast("Link copied to clipboard!", "success")
      setTimeout(() => setCopied(false), 2000)
    } catch {
      onToast("Failed to copy link", "error")
    }
  }

  const handleShareX = () => {
    // encodeURIComponent preserves the em dash and full URL correctly
    const tweetUrl = `https://x.com/intent/tweet?text=${encodeURIComponent(xText)}`
    window.open(tweetUrl, "_blank", "noopener,noreferrer,width=550,height=420")
    setOpen(false)
    onToast("Opening X to share your quest!", "info")
  }

  const handleCopyDiscord = async () => {
    try {
      await navigator.clipboard.writeText(discordText)
      setDiscordCopied(true)
      onToast("Discord message copied!", "success")
      setTimeout(() => setDiscordCopied(false), 2000)
    } catch {
      onToast("Failed to copy", "error")
    }
  }

  const useMobileShare = isMobileWithShareApi()

  const dropdown = open ? (
    <div
      ref={panelRef}
      style={{
        position: "absolute",
        top: pos.top,
        right: pos.right,
        // Explicit fixed stacking context — renders above everything
        zIndex: 9999,
      }}
      className={cn(
        "bg-card text-card-foreground border-[3px] border-black shadow-[6px_6px_0_#000]",
        "w-72 overflow-hidden animate-fade-in-down"
      )}
      role="dialog"
      aria-label="Share options"
    >
      {/* Panel header */}
      <div className="bg-primary border-b-[3px] border-black px-4 py-2.5 flex items-center justify-between">
        <span className="text-xs font-black uppercase tracking-wider">Share this quest</span>
        <button
          onClick={() => setOpen(false)}
          className="w-5 h-5 flex items-center justify-center hover:opacity-70 transition-opacity cursor-pointer"
          aria-label="Close share menu"
        >
          <XClose className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Quest name preview */}
      <div className="px-4 py-3 border-b-[2px] border-black bg-secondary">
        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-0.5">Quest</p>
        <p className="text-sm font-black truncate">{questName}</p>
      </div>

      {/* Share options */}
      <div className="p-3 flex flex-col gap-2">
        <ShareOption
          icon={copied ? <Check className="h-4 w-4" /> : <Link className="h-4 w-4" />}
          label={copied ? "Copied!" : "Copy Link"}
          sublabel={questUrl.replace("https://", "")}
          onClick={handleCopyLink}
          active={copied}
        />
        <ShareOption
          icon={<XIcon className="h-4 w-4" />}
          label="Share on X"
          sublabel={`"...${questName} — ${window.location.host}/..."`}
          onClick={handleShareX}
        />
        <ShareOption
          icon={discordCopied ? <Check className="h-4 w-4" /> : <DiscordIcon className="h-4 w-4" />}
          label={discordCopied ? "Copied!" : "Copy for Discord"}
          sublabel="Formatted message ready to paste"
          onClick={handleCopyDiscord}
          active={discordCopied}
        />
      </div>

      {/* URL bar */}
      <div className="mx-3 mb-3 border-[2px] border-black bg-secondary px-3 py-2 flex items-center gap-2">
        <p className="flex-1 text-xs font-mono text-muted-foreground truncate">{questUrl}</p>
        <button
          onClick={handleCopyLink}
          className="shrink-0 w-6 h-6 border-[1.5px] border-black bg-card flex items-center justify-center neo-press hover:bg-primary transition-colors cursor-pointer"
          aria-label="Copy URL"
        >
          {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
        </button>
      </div>
    </div>
  ) : null

  return (
    <>
      <button
        ref={triggerRef}
        onClick={() => {
          if (useMobileShare) {
            handleNativeShare()
          } else {
            handleOpen()
          }
        }}
        aria-label="Share quest"
        aria-expanded={open}
        className={cn(
          "flex items-center gap-2 border-[2px] border-black font-bold text-sm",
          "bg-card text-card-foreground shadow-[3px_3px_0_#000]",
          "neo-press hover:bg-primary transition-colors cursor-pointer",
          open && "bg-primary shadow-[1px_1px_0_#000] translate-x-0.5 translate-y-0.5",
          compact ? "w-9 h-9 justify-center" : "px-4 py-2"
        )}
      >
        <Share2 className="h-4 w-4 shrink-0" />
        {!compact && <span>Share</span>}
      </button>

      {/* Portal: renders at document.body, escapes all overflow/z-index parents */}
      {typeof document !== "undefined" && createPortal(dropdown, document.body)}
    </>
  )
}

/* ─── Individual share option row ─── */

interface ShareOptionProps {
  icon: React.ReactNode
  label: string
  sublabel: string
  onClick: () => void
  active?: boolean
}

function ShareOption({ icon, label, sublabel, onClick, active }: ShareOptionProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 px-3 py-2.5 border-[2px] border-black",
        "text-left transition-all cursor-pointer neo-press",
        "shadow-[2px_2px_0_#000] hover:shadow-[3px_3px_0_#000]",
        active ? "bg-success" : "bg-card hover:bg-primary"
      )}
    >
      <div className="shrink-0">{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-black leading-none mb-0.5">{label}</p>
        <p className="text-xs text-muted-foreground truncate leading-none">{sublabel}</p>
      </div>
    </button>
  )
}