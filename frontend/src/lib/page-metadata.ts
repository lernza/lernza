export const SITE_URL = "https://lernza.com"
export const DEFAULT_OG_IMAGE = `${SITE_URL}/og-image.png`

export interface PageMeta {
  title: string
  description: string
  canonicalUrl: string
  ogImage: string
}

function pageMeta(name: string, description: string, path: string): PageMeta {
  return {
    title: `Lernza — ${name}`,
    description,
    canonicalUrl: `${SITE_URL}${path}`,
    ogImage: DEFAULT_OG_IMAGE,
  }
}

export const PAGE_METADATA = {
  landing: {
    title: "Lernza — Learn. Earn. On-chain.",
    description:
      "The first learn-to-earn platform on Stellar. Create quests, set milestones, reward learners with tokens.",
    canonicalUrl: SITE_URL,
    ogImage: DEFAULT_OG_IMAGE,
  },
  dashboard: pageMeta(
    "Dashboard",
    "Browse quests, track your enrolled milestones, and follow your on-chain earnings on Lernza.",
    "/dashboard"
  ),
  leaderboard: pageMeta(
    "Leaderboard",
    "See the top earners and most active quests on Lernza, the learn-to-earn platform on Stellar.",
    "/leaderboard"
  ),
  profile: pageMeta(
    "Profile",
    "Your Lernza profile: earnings, completed milestones, and recent on-chain activity.",
    "/profile"
  ),
  createQuest: pageMeta(
    "Create Quest",
    "Create a quest on Lernza, set milestones, and reward learners with tokens on Stellar.",
    "/create-quest"
  ),
  history: pageMeta(
    "History",
    "Review your Lernza transaction history: enrollments, milestone completions, and reward payouts.",
    "/history"
  ),
  analytics: pageMeta(
    "Analytics",
    "Platform-wide Lernza analytics: quests, enrollments, milestone completion, and rewards distributed.",
    "/analytics"
  ),
  creatorDashboard: pageMeta(
    "Creator Dashboard",
    "Manage your Lernza quests, track learner progress, and monitor reward pools.",
    "/creator-dashboard"
  ),
  notFound: {
    title: "Lernza — Page Not Found",
    description: "The page you are looking for does not exist on Lernza.",
    canonicalUrl: SITE_URL,
    ogImage: DEFAULT_OG_IMAGE,
  },
} satisfies Record<string, PageMeta>

export function creatorPageMeta(address?: string | null): PageMeta {
  if (!address) {
    return pageMeta("Creator", "Quests, learners, and rewards from a Lernza creator.", "/")
  }
  return pageMeta(
    "Creator",
    `Quests, learners, and rewards created by ${address} on Lernza.`,
    `/creator/${encodeURIComponent(address)}`
  )
}

export function questPageMeta(questId: number, questName?: string, questDescription?: string): PageMeta {
  return {
    title: questName ? `${questName} — Lernza` : "Lernza — Quest",
    description:
      questDescription?.trim() ||
      "Join this quest on Lernza, complete milestones, and earn token rewards on Stellar.",
    canonicalUrl: `${SITE_URL}/quest/${questId}`,
    ogImage: DEFAULT_OG_IMAGE,
  }
}
