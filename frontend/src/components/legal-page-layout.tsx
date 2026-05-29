import type { ReactNode } from "react"
import { PageContainer } from "@/components/page-container"
import { PageMetadata } from "@/components/page-metadata"

interface LegalPageLayoutProps {
  title: string
  lastUpdated: string
  description: string
  canonicalPath: string
  children: ReactNode
}

export function LegalPageLayout({
  title,
  lastUpdated,
  description,
  canonicalPath,
  children,
}: LegalPageLayoutProps) {
  const pageTitle = `${title} — Lernza`

  return (
    <>
      <PageMetadata
        title={pageTitle}
        description={description}
        canonicalUrl={`https://lernza.com${canonicalPath}`}
      />
      <PageContainer width="narrow">
        <article className="prose-legal">
          <header className="border-border mb-8 border-b-[3px] pb-6">
            <h1 className="mb-2 text-3xl font-black tracking-tight sm:text-4xl">{title}</h1>
            <p className="text-muted-foreground text-sm font-bold">Last updated: {lastUpdated}</p>
          </header>
          <div className="space-y-6 text-sm leading-relaxed">{children}</div>
        </article>
      </PageContainer>
    </>
  )
}

interface LegalSectionProps {
  title: string
  children: ReactNode
}

export function LegalSection({ title, children }: LegalSectionProps) {
  return (
    <section>
      <h2 className="mb-3 text-lg font-black tracking-tight">{title}</h2>
      <div className="text-muted-foreground space-y-3">{children}</div>
    </section>
  )
}
