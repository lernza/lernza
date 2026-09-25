import React from "react"
import { describe, it, expect } from "vitest"
import { render } from "@testing-library/react"
import { axe } from "vitest-axe"

/**
 * Calculates WCAG 2.1 relative luminance for an sRGB color.
 * https://www.w3.org/WAI/GL/wiki/Relative_luminance
 */
export function getRelativeLuminance(hex: string): number {
  const cleanHex = hex.replace("#", "")
  const r = parseInt(cleanHex.substring(0, 2), 16) / 255
  const g = parseInt(cleanHex.substring(2, 4), 16) / 255
  const b = parseInt(cleanHex.substring(4, 6), 16) / 255

  const sRGB = [r, g, b].map(val => {
    return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4)
  })

  return 0.2126 * sRGB[0] + 0.7152 * sRGB[1] + 0.0722 * sRGB[2]
}

/**
 * Calculates WCAG 2.1 contrast ratio between two hex colors.
 * (L1 + 0.05) / (L2 + 0.05) where L1 is the lighter luminance.
 */
export function getContrastRatio(hex1: string, hex2: string): number {
  const lum1 = getRelativeLuminance(hex1)
  const lum2 = getRelativeLuminance(hex2)
  const lighter = Math.max(lum1, lum2)
  const darker = Math.min(lum1, lum2)
  return Number(((lighter + 0.05) / (darker + 0.05)).toFixed(2))
}

export const THEME_PALETTES = {
  light: {
    background: "#fbfaf7",
    card: "#ffffff",
    secondary: "#f3f1eb",
    muted: "#efede6",
    foreground: "#1a1813",
    mutedForeground: "#6b6256",
    primary: "#1a1813",
    primaryForeground: "#fbfaf7",
    accent: "#b45309",
    accentForeground: "#ffffff",
    destructive: "#b91c1c",
    destructiveForeground: "#ffffff",
    success: "#166534",
    successForeground: "#ffffff",
    warning: "#92400e",
    warningForeground: "#ffffff",
  },
  dark: {
    background: "#16140f",
    card: "#1d1a14",
    secondary: "#221f18",
    muted: "#2a261f",
    foreground: "#ede9e0",
    mutedForeground: "#a89e8c",
    primary: "#ede9e0",
    primaryForeground: "#16140f",
    accent: "#e0a04d",
    accentForeground: "#16140f",
    destructive: "#f87171",
    destructiveForeground: "#16140f",
    success: "#4ade80",
    successForeground: "#16140f",
    warning: "#e0a04d",
    warningForeground: "#16140f",
  },
}

describe("WCAG AA Color Contrast Audit", () => {
  describe("Light Theme Palette", () => {
    const { light } = THEME_PALETTES

    it("verifies standard body text meets WCAG AA (>= 4.5:1)", () => {
      // Foreground on Background
      const fgOnBg = getContrastRatio(light.foreground, light.background)
      expect(fgOnBg).toBeGreaterThanOrEqual(4.5)

      // Foreground on Card
      const fgOnCard = getContrastRatio(light.foreground, light.card)
      expect(fgOnCard).toBeGreaterThanOrEqual(4.5)

      // Foreground on Secondary
      const fgOnSec = getContrastRatio(light.foreground, light.secondary)
      expect(fgOnSec).toBeGreaterThanOrEqual(4.5)
    })

    it("verifies muted text meets WCAG AA (>= 4.5:1)", () => {
      // Muted foreground on Background
      const mutedOnBg = getContrastRatio(light.mutedForeground, light.background)
      expect(mutedOnBg).toBeGreaterThanOrEqual(4.5)

      // Muted foreground on Card
      const mutedOnCard = getContrastRatio(light.mutedForeground, light.card)
      expect(mutedOnCard).toBeGreaterThanOrEqual(4.5)

      // Muted foreground on Muted
      const mutedOnMuted = getContrastRatio(light.mutedForeground, light.muted)
      expect(mutedOnMuted).toBeGreaterThanOrEqual(4.5)
    })

    it("verifies button text and solid badges meet WCAG AA (>= 4.5:1)", () => {
      // Primary button
      const primaryBtn = getContrastRatio(light.primaryForeground, light.primary)
      expect(primaryBtn).toBeGreaterThanOrEqual(4.5)

      // Accent button
      const accentBtn = getContrastRatio(light.accentForeground, light.accent)
      expect(accentBtn).toBeGreaterThanOrEqual(4.5)

      // Destructive button
      const destructiveBtn = getContrastRatio(light.destructiveForeground, light.destructive)
      expect(destructiveBtn).toBeGreaterThanOrEqual(4.5)

      // Success button / badge
      const successBtn = getContrastRatio(light.successForeground, light.success)
      expect(successBtn).toBeGreaterThanOrEqual(4.5)

      // Warning button / badge
      const warningBtn = getContrastRatio(light.warningForeground, light.warning)
      expect(warningBtn).toBeGreaterThanOrEqual(4.5)
    })

    it("verifies semantic status text on card backgrounds meets WCAG AA (>= 4.5:1)", () => {
      // Success text on Card
      const successOnCard = getContrastRatio(light.success, light.card)
      expect(successOnCard).toBeGreaterThanOrEqual(4.5)

      // Warning text on Card
      const warningOnCard = getContrastRatio(light.warning, light.card)
      expect(warningOnCard).toBeGreaterThanOrEqual(4.5)

      // Destructive text on Card
      const destructiveOnCard = getContrastRatio(light.destructive, light.card)
      expect(destructiveOnCard).toBeGreaterThanOrEqual(4.5)
    })
  })

  describe("Dark Theme Palette", () => {
    const { dark } = THEME_PALETTES

    it("verifies standard body text meets WCAG AA (>= 4.5:1)", () => {
      // Foreground on Background
      const fgOnBg = getContrastRatio(dark.foreground, dark.background)
      expect(fgOnBg).toBeGreaterThanOrEqual(4.5)

      // Foreground on Card
      const fgOnCard = getContrastRatio(dark.foreground, dark.card)
      expect(fgOnCard).toBeGreaterThanOrEqual(4.5)

      // Foreground on Secondary
      const fgOnSec = getContrastRatio(dark.foreground, dark.secondary)
      expect(fgOnSec).toBeGreaterThanOrEqual(4.5)
    })

    it("verifies muted text meets WCAG AA (>= 4.5:1)", () => {
      // Muted foreground on Background
      const mutedOnBg = getContrastRatio(dark.mutedForeground, dark.background)
      expect(mutedOnBg).toBeGreaterThanOrEqual(4.5)

      // Muted foreground on Card
      const mutedOnCard = getContrastRatio(dark.mutedForeground, dark.card)
      expect(mutedOnCard).toBeGreaterThanOrEqual(4.5)
    })

    it("verifies button text and solid badges meet WCAG AA (>= 4.5:1)", () => {
      // Primary button
      const primaryBtn = getContrastRatio(dark.primaryForeground, dark.primary)
      expect(primaryBtn).toBeGreaterThanOrEqual(4.5)

      // Accent button
      const accentBtn = getContrastRatio(dark.accentForeground, dark.accent)
      expect(accentBtn).toBeGreaterThanOrEqual(4.5)

      // Destructive button
      const destructiveBtn = getContrastRatio(dark.destructiveForeground, dark.destructive)
      expect(destructiveBtn).toBeGreaterThanOrEqual(4.5)

      // Success button / badge
      const successBtn = getContrastRatio(dark.successForeground, dark.success)
      expect(successBtn).toBeGreaterThanOrEqual(4.5)

      // Warning button / badge
      const warningBtn = getContrastRatio(dark.warningForeground, dark.warning)
      expect(warningBtn).toBeGreaterThanOrEqual(4.5)
    })
  })

  describe("Axe-Core Automated Contrast Suite", () => {
    it("runs axe-core contrast checks on light theme components", async () => {
      const { light } = THEME_PALETTES
      const { container } = render(
        <div style={{ backgroundColor: light.background, color: light.foreground, padding: 16 }}>
          <h1 style={{ color: light.foreground, fontSize: "24px" }}>Lernza Quests</h1>
          <p style={{ color: light.mutedForeground, fontSize: "14px" }}>
            Explore available quests and complete milestones to earn USDC rewards.
          </p>
          <div style={{ backgroundColor: light.card, color: light.foreground, padding: 16, marginTop: 8 }}>
            <span style={{ backgroundColor: light.accent, color: light.accentForeground, padding: "4px 8px" }}>
              Featured
            </span>
            <span style={{ backgroundColor: light.success, color: light.successForeground, padding: "4px 8px", marginLeft: 8 }}>
              Active
            </span>
            <button
              type="button"
              style={{ backgroundColor: light.primary, color: light.primaryForeground, padding: "8px 16px", marginLeft: 8 }}
            >
              Enroll Now
            </button>
          </div>
        </div>
      )

      const results = await axe(container, {
        rules: {
          "color-contrast": { enabled: true },
        },
      })
      expect(results).toHaveNoViolations()
    })

    it("runs axe-core contrast checks on dark theme components", async () => {
      const { dark } = THEME_PALETTES
      const { container } = render(
        <div className="dark" style={{ backgroundColor: dark.background, color: dark.foreground, padding: 16 }}>
          <h1 style={{ color: dark.foreground, fontSize: "24px" }}>Lernza Quests</h1>
          <p style={{ color: dark.mutedForeground, fontSize: "14px" }}>
            Explore available quests and complete milestones to earn USDC rewards.
          </p>
          <div style={{ backgroundColor: dark.card, color: dark.foreground, padding: 16, marginTop: 8 }}>
            <span style={{ backgroundColor: dark.accent, color: dark.accentForeground, padding: "4px 8px" }}>
              Featured
            </span>
            <span style={{ backgroundColor: dark.success, color: dark.successForeground, padding: "4px 8px", marginLeft: 8 }}>
              Active
            </span>
            <button
              type="button"
              style={{ backgroundColor: dark.primary, color: dark.primaryForeground, padding: "8px 16px", marginLeft: 8 }}
            >
              Enroll Now
            </button>
          </div>
        </div>
      )

      const results = await axe(container, {
        rules: {
          "color-contrast": { enabled: true },
        },
      })
      expect(results).toHaveNoViolations()
    })
  })
})
