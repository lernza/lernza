import { Helmet } from "react-helmet-async"
import { getQuestUrl } from "@/lib/app-url"

interface QuestMetadataProps {
  questId: number
  questName: string
  questDescription: string
}

export function QuestMetadata({ questId, questName, questDescription }: QuestMetadataProps) {
  const questUrl = getQuestUrl(questId)
  const title = `${questName} | Lernza`
  const description = questDescription || "Learn and earn on-chain with Lernza"
  const ogImage = "https://lernza.com/og-image.png"

  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={questUrl} />

      {/* Open Graph */}
      <meta property="og:type" content="website" />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:image:width" content="1280" />
      <meta property="og:image:height" content="640" />
      <meta property="og:url" content={questUrl} />
      <meta property="og:site_name" content="Lernza" />

      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />
    </Helmet>
  )
}
