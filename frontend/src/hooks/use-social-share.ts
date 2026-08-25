import { useState } from "react"
import type { ShareConfig } from "@/components/social-share-modal"

interface UseSocialShareReturn {
  isOpen: boolean
  shareConfig: ShareConfig | null
  openShare: (config: ShareConfig) => void
  closeShare: () => void
  shareOnTwitter: (config: ShareConfig) => void
  shareOnDiscord: (config: ShareConfig) => void
  copyToClipboard: (text: string) => Promise<void>
}

export function useSocialShare(): UseSocialShareReturn {
  const [isOpen, setIsOpen] = useState(false)
  const [shareConfig, setShareConfig] = useState<ShareConfig | null>(null)

  const openShare = (config: ShareConfig) => {
    setShareConfig(config)
    setIsOpen(true)
  }

  const closeShare = () => {
    setIsOpen(false)
    setShareConfig(null)
  }

  const shareOnTwitter = (config: ShareConfig) => {
    const text = `${config.achievementText} on ${config.questName}! Check it out on Lernza: ${config.url || window.location.href}`
    const encoded = encodeURIComponent(text)
    window.open(
      `https://twitter.com/intent/tweet?text=${encoded}`,
      "twitter-share",
      "width=550,height=420",
    )
  }

  const shareOnDiscord = (config: ShareConfig) => {
    const text = `**${config.title}**\n${config.description}\n${config.achievementText} on ${config.questName}!\n${config.url || window.location.href}`
    navigator.clipboard.writeText(text)
  }

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
    } catch (err) {
      console.error("Failed to copy to clipboard:", err)
    }
  }

  return {
    isOpen,
    shareConfig,
    openShare,
    closeShare,
    shareOnTwitter,
    shareOnDiscord,
    copyToClipboard,
  }
}
