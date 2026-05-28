import { Helmet } from "react-helmet-async"

interface PageMetadataProps {
  title?: string
  description?: string
  canonicalUrl?: string
  ogImage?: string
}

const DEFAULT_TITLE = "Lernza — Learn. Earn. On-chain."
const DEFAULT_DESCRIPTION =
  "The first learn-to-earn platform on Stellar. Create quests, set milestones, reward learners with tokens."
const DEFAULT_OG_IMAGE = "https://lernza.com/og-image.png"
const DEFAULT_URL = "https://lernza.com"

export function PageMetadata({
  title = DEFAULT_TITLE,
  description = DEFAULT_DESCRIPTION,
  canonicalUrl = DEFAULT_URL,
  ogImage = DEFAULT_OG_IMAGE,
}: PageMetadataProps) {
  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={canonicalUrl} />

      {/* Open Graph */}
      <meta property="og:type" content="website" />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:image:width" content="1280" />
      <meta property="og:image:height" content="640" />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:site_name" content="Lernza" />

      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />
    </Helmet>
  )
}
