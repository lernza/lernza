import { useState, useRef, useEffect, useCallback } from "react"
import { createPortal } from "react-dom"
import { Share2, Link, X as XClose, Copy, Check } from "lucide-react"
import { DiscordBrandIcon, XBrandIcon } from "@/components/brand-icons"
import { useFocusTrap } from "@/hooks/use-focus-trap"
import { cn } from "@/lib/utils"

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

  // Close on Escape, trap focus in the panel, and hand focus back to the
  // trigger on close so keyboard users are not dropped at the top of the page.
  const closeDropdown = useCallback(() => setOpen(false), [])

  useFocusTrap(panelRef, {
    isActive: open,
    onEscape: closeDropdown,
  })

  const handleOpen = () => {
    updatePos()
    setOpen(v => !v)
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
      )
        return
      closeDropdown()
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [open, closeDropdown])

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
      onToast("Copied to clipboard!", "success")
      setTimeout(() => setCopied(false), 2000)
    } catch {
      onToast("Unable to copy to clipboard. Please try again.", "error")
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
        "bg-card text-card-foreground border-border border shadow-lg",
        "animate-fade-in-down w-72 overflow-hidden"
      )}
      role="dialog"
      aria-label="Share options"
      tabIndex={-1}
    >
      {/* Panel header */}
      <div className="bg-accent border-border flex items-center justify-between border-b px-4 py-2.5">
        <span className="text-xs font-semibold tracking-wider uppercase">Share this quest</span>
        <button
          onClick={() => setOpen(false)}
          className="flex h-5 w-5 cursor-pointer items-center justify-center transition-opacity hover:opacity-70"
          aria-label="Close share menu"
        >
          <XClose className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Quest name preview */}
      <div className="border-border bg-secondary border-b px-4 py-3">
        <p className="text-muted-foreground mb-0.5 text-xs font-bold tracking-wider uppercase">
          Quest
        </p>
        <p className="truncate text-sm font-semibold">{questName}</p>
      </div>

      {/* Share options */}
      <div className="flex flex-col gap-2 p-3">
        <ShareOption
          icon={copied ? <Check className="h-4 w-4" /> : <Link className="h-4 w-4" />}
          label={copied ? "Copied!" : "Copy Link"}
          sublabel={questUrl.replace("https://", "")}
          onClick={handleCopyLink}
          active={copied}
        />
        <ShareOption
          icon={<XBrandIcon className="h-4 w-4" />}
          label="Share on X"
          sublabel={`"...${questName} — ${window.location.host}/..."`}
          onClick={handleShareX}
        />
        <ShareOption
          icon={
            discordCopied ? <Check className="h-4 w-4" /> : <DiscordBrandIcon className="h-4 w-4" />
          }
          label={discordCopied ? "Copied!" : "Copy for Discord"}
          sublabel="Formatted message ready to paste"
          onClick={handleCopyDiscord}
          active={discordCopied}
        />
      </div>

      {/* URL bar */}
      <div className="border-border bg-secondary mx-3 mb-3 flex items-center gap-2 border px-3 py-2">
        <p className="text-muted-foreground flex-1 truncate font-mono text-xs">{questUrl}</p>
        <button
          onClick={handleCopyLink}
          className="border-border bg-card neo-press hover:bg-accent flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center border-[1.5px] transition-colors"
          aria-label="Copy quest URL to clipboard"
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
          "border-border flex items-center gap-2 border text-sm font-bold",
          "bg-card text-card-foreground shadow-md",
          "neo-press hover:bg-accent cursor-pointer transition-colors",
          open && "bg-accent translate-x-0.5 translate-y-0.5 shadow-sm",
          compact ? "h-9 w-9 justify-center" : "px-4 py-2"
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
        "border-border flex w-full items-center gap-3 border px-3 py-2.5",
        "neo-press cursor-pointer text-left transition-all",
        "shadow-sm hover:shadow-md",
        active ? "bg-success" : "bg-card hover:bg-accent"
      )}
    >
      <div className="shrink-0">{icon}</div>
      <div className="min-w-0 flex-1">
        <p className="mb-0.5 text-sm leading-none font-semibold">{label}</p>
        <p className="text-muted-foreground truncate text-xs leading-none">{sublabel}</p>
      </div>
    </button>
  )
}
