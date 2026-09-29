import type { QuestInfo } from "./contract-types";

const DEFAULT_OG_IMAGE = "https://lernza.com/og-image.png";
const SITE_URL = (import.meta as any).env?.VITE_SITE_URL ?? "https://lernza.com";

export interface QuestMetadata {
  title: string;
  description: string;
  ogImage: string;
  canonicalUrl: string;
  ogType: string;
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max - 3) + "...";
}

export function buildQuestMetadata(quest: QuestInfo, questId: number): QuestMetadata {
  const title = quest.name ? `${quest.name} — Quest on Lernza` : `Quest #${questId} — Lernza`;
  const rawDesc = quest.description || "Join this quest on Lernza, complete milestones, and earn on-chain rewards on Stellar.";
  const description = truncate(rawDesc, 160);
  const canonicalUrl = `${SITE_URL}/quest/${questId}`;
  // Use quest image if available, otherwise branded fallback
  const ogImage = (quest as any).imageUrl || (quest as any).coverImage || DEFAULT_OG_IMAGE;
  return {
    title,
    description,
    ogImage,
    canonicalUrl,
    ogType: "website",
  };
}

export function buildQuestOgTags(meta: QuestMetadata): Record<string, string> {
  return {
    "og:title": meta.title,
    "og:description": meta.description,
    "og:image": meta.ogImage,
    "og:url": meta.canonicalUrl,
    "og:type": meta.ogType,
  };
}
