import { describe, it, expect } from "vitest"
import { render } from "@testing-library/react"
import { HelmetProvider } from "react-helmet-async"
import { PageMetadata } from "./page-metadata"

describe("PageMetadata", () => {
  it("applies document metadata correctly", () => {
    render(
      <HelmetProvider>
        <PageMetadata
          title="Quest 1 | Lernza"
          description="A quest to learn on-chain development."
          canonicalUrl="https://lernza.com/quest/1"
          ogImage="https://lernza.com/og-quest.png"
        />
      </HelmetProvider>
    )

    expect(document.title).toBe("Quest 1 | Lernza")
    expect(document.querySelector("meta[name='description']")?.getAttribute("content")).toBe(
      "A quest to learn on-chain development."
    )
    expect(document.querySelector("link[rel='canonical']")?.getAttribute("href")).toBe(
      "https://lernza.com/quest/1"
    )
  })
})
