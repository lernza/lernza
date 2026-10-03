import { describe, it, expect } from "vitest"
import { render } from "@testing-library/react"
import { HelmetProvider } from "react-helmet-async"
import { PageMetadata } from "@/components/PageMetadata"
import { PAGE_METADATA, creatorPageMeta, questPageMeta, type PageMeta } from "@/lib/page-metadata"

function renderMeta(meta: PageMeta) {
  render(
    <HelmetProvider>
      <PageMetadata {...meta} />
    </HelmetProvider>
  )
}

function metaContent(selector: string) {
  return document.querySelector(selector)?.getAttribute("content")
}

describe("page metadata", () => {
  it.each([
    ["dashboard", "Lernza — Dashboard"],
    ["leaderboard", "Lernza — Leaderboard"],
    ["profile", "Lernza — Profile"],
    ["createQuest", "Lernza — Create Quest"],
    ["history", "Lernza — History"],
    ["analytics", "Lernza — Analytics"],
    ["creatorDashboard", "Lernza — Creator Dashboard"],
  ] as const)("sets title and Open Graph tags for %s", (key, expectedTitle) => {
    const meta = PAGE_METADATA[key]
    renderMeta(meta)

    expect(document.title).toBe(expectedTitle)
    expect(metaContent("meta[property='og:title']")).toBe(expectedTitle)
    expect(metaContent("meta[property='og:description']")).toBe(meta.description)
    expect(metaContent("meta[property='og:image']")).toBe(meta.ogImage)
    expect(metaContent("meta[property='og:url']")).toBe(meta.canonicalUrl)
    expect(metaContent("meta[name='twitter:title']")).toBe(expectedTitle)
  })

  it("gives every page a distinct title", () => {
    const titles = Object.values(PAGE_METADATA).map((meta) => meta.title)
    expect(new Set(titles).size).toBe(titles.length)
  })

  it("builds quest metadata from the quest name and description", () => {
    const meta = questPageMeta(7, "Intro to Soroban", "Learn smart contracts")
    expect(meta.title).toBe("Intro to Soroban — Lernza")
    expect(meta.description).toBe("Learn smart contracts")
    expect(meta.canonicalUrl).toBe("https://lernza.com/quest/7")
  })

  it("falls back to a generic quest title while the quest loads", () => {
    const meta = questPageMeta(7)
    expect(meta.title).toBe("Lernza — Quest")
    expect(meta.description).not.toBe("")
  })

  it("builds creator metadata with an encoded canonical URL", () => {
    const meta = creatorPageMeta("GABC")
    expect(meta.title).toBe("Lernza — Creator")
    expect(meta.canonicalUrl).toBe("https://lernza.com/creator/GABC")
  })
})
