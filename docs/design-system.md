# Design System

Lernza uses a neo-brutalist design language built on top of Tailwind CSS v4 and
shadcn/ui primitives. This document covers the two layout primitives that every
page-level component should use: **PageContainer** and **PageHeader**.

## PageContainer

`frontend/src/components/page-container.tsx`

A centred wrapper that provides consistent horizontal gutters, max-width, and
optional vertical padding across every page.

### Props

| Prop        | Type                               | Default     | Description                                  |
|:------------|:-----------------------------------|:------------|:---------------------------------------------|
| `children`  | `ReactNode`                        | (required)  | Page content.                                |
| `pad`       | `boolean`                          | `true`      | When `false`, omits vertical padding.        |
| `width`     | `"default" \| "narrow" \| "wide"` | `"default"` | Controls `max-width` (see table below).      |
| `className` | `string`                           | `undefined` | Merged via `cn()` for one-off overrides.     |

All other props are forwarded to the underlying `<div>`.

### Width tokens

| Value       | Tailwind class       | Use case                                     |
|:------------|:---------------------|:---------------------------------------------|
| `"default"` | `max-w-7xl`          | Dashboards, detail pages, forms.             |
| `"narrow"`  | `max-w-3xl`          | Leaderboard, legal pages, dense list views.  |
| `"wide"`    | `max-w-screen-2xl`   | Landing / marketing pages.                   |

### When to use which width

- **default** for most authenticated pages (dashboard, quest detail, profile,
  creator page). Gives enough room for cards, stats panels, and multi-column
  layouts without feeling empty on ultrawide monitors.
- **narrow** when the content is a single column of dense rows. The leaderboard
  and legal/terms pages use this.
- **wide** only for the public-facing landing page where full-bleed hero
  sections need breathing room.

### Example

```tsx
import { PageContainer } from "@/components/page-container"
import { PageHeader } from "@/components/page-header"

export function Leaderboard() {
  return (
    <PageContainer width="narrow">
      <PageHeader
        eyebrow="Rankings"
        title="Leaderboard"
        subtitle="Top learners by quest completions"
      />
      {/* table rows */}
    </PageContainer>
  )
}
```

---

## PageHeader

`frontend/src/components/page-header.tsx`

The canonical top-of-page header. Renders a title (`<h1>`), optional eyebrow
pill, subtitle, and a right-aligned action slot. On small screens the layout
stacks; on `sm` and above it becomes a flex row.

### Props

| Prop        | Type        | Default     | Description                                         |
|:------------|:------------|:------------|:----------------------------------------------------|
| `eyebrow`   | `ReactNode` | `undefined` | Uppercase label rendered as a yellow pill above the title. |
| `title`     | `ReactNode` | (required)  | Page title, rendered as `<h1>`.                     |
| `subtitle`  | `ReactNode` | `undefined` | One-line description beneath the title.             |
| `action`    | `ReactNode` | `undefined` | Right-aligned slot for buttons, links, or badges.   |
| `className` | `string`    | `undefined` | Merged via `cn()` for one-off overrides.            |

### Example

```tsx
<PageHeader
  eyebrow="Quest Management"
  title="Dashboard"
  subtitle="Track and manage your active quests"
  action={<button onClick={onCreateQuest}>Create Quest</button>}
/>
```

### Usage guidelines

- Every authenticated page should include exactly one `PageHeader` inside a
  `PageContainer`. This keeps titles, spacing, and responsive behaviour
  consistent across the app.
- Place the `PageHeader` as the first child of `PageContainer`.
- Use the `action` slot for the primary page-level CTA (e.g. "Create Quest",
  "Export"). Avoid placing more than two actions; if needed, group them in a
  dropdown.
- The `eyebrow` is optional. Use it to provide section context (e.g.
  "Rankings", "Quest Management") but keep it to two or three words.

---

## Combining both primitives

The intended pattern for any new page:

```tsx
import { PageContainer } from "@/components/page-container"
import { PageHeader } from "@/components/page-header"

export function MyPage() {
  return (
    <PageContainer>
      <PageHeader title="Page Title" subtitle="Short description" />
      {/* page body */}
    </PageContainer>
  )
}
```

Avoid creating bespoke wrapper `<div>`s with ad-hoc `max-w-*` or `px-*`
classes. If the existing width tokens do not fit a new layout, propose a new
token in `PageContainer` rather than inlining a one-off width.

---

## WCAG AA Compliant Color Palette

Lernza enforces WCAG 2.1 Level AA color contrast requirements across all supported themes (Light and Dark).

### Contrast Thresholds

- **Normal Text (<18pt / <14pt bold):** Minimum contrast ratio of **4.5:1**
- **Large Text (>=18pt / >=14pt bold):** Minimum contrast ratio of **3.0:1**
- **UI Components & Graphical Objects:** Minimum contrast ratio of **3.0:1**

### Light Theme (`:root`)

| Token | Hex Value | Target Background | Foreground / Usage | Contrast Ratio | WCAG Compliance |
|:---|:---|:---|:---|:---|:---|
| `--color-background` | `#fbfaf7` | N/A | Warm paper base | — | — |
| `--color-foreground` | `#1a1813` | `#fbfaf7` (bg) | Primary ink text | **16.9:1** | AAA (>= 7:1) |
| `--color-card` | `#ffffff` | `#fbfaf7` (bg) | Card surface | — | — |
| `--color-card-foreground` | `#1a1813` | `#ffffff` (card) | Body text on card | **17.8:1** | AAA (>= 7:1) |
| `--color-muted-foreground`| `#6b6256` | `#ffffff` (card) | Secondary / helper text | **5.86:1** | AA (>= 4.5:1) |
| `--color-muted-foreground`| `#6b6256` | `#fbfaf7` (bg) | Secondary / helper text | **5.61:1** | AA (>= 4.5:1) |
| `--color-primary` | `#1a1813` | `#fbfaf7` (bg) | Primary buttons | **16.9:1** | AAA |
| `--color-primary-foreground` | `#fbfaf7` | `#1a1813` (primary)| Button text | **16.9:1** | AAA |
| `--color-accent` | `#b45309` | `#ffffff` (card) | Highlighting & links | **4.81:1** | AA |
| `--color-accent-foreground` | `#ffffff` | `#b45309` (accent) | Button/badge text | **4.81:1** | AA |
| `--color-success` | `#166534` | `#ffffff` (card) | Success text / badge | **6.70:1** | AA |
| `--color-success` | `#166534` | `bg-success/12` | Success pill text | **5.70:1** | AA |
| `--color-warning` | `#92400e` | `#ffffff` (card) | Warning text / badge | **6.00:1** | AA |
| `--color-warning` | `#92400e` | `bg-warning/12` | Warning pill text | **5.66:1** | AA |
| `--color-destructive` | `#b91c1c` | `#ffffff` (card) | Error text / badge | **6.20:1** | AA |

### Dark Theme (`.dark`)

| Token | Hex Value | Target Background | Foreground / Usage | Contrast Ratio | WCAG Compliance |
|:---|:---|:---|:---|:---|:---|
| `--color-background` | `#16140f` | N/A | Warm near-black base | — | — |
| `--color-foreground` | `#ede9e0` | `#16140f` (bg) | Primary paper text | **14.9:1** | AAA (>= 7:1) |
| `--color-card` | `#1d1a14` | `#16140f` (bg) | Card surface | — | — |
| `--color-card-foreground` | `#ede9e0` | `#1d1a14` (card) | Body text on card | **14.2:1** | AAA (>= 7:1) |
| `--color-muted-foreground`| `#a89e8c` | `#1d1a14` (card) | Secondary / helper text | **6.62:1** | AA (>= 4.5:1) |
| `--color-muted-foreground`| `#a89e8c` | `#16140f` (bg) | Secondary / helper text | **6.94:1** | AA (>= 4.5:1) |
| `--color-primary` | `#ede9e0` | `#16140f` (bg) | Primary buttons | **14.9:1** | AAA |
| `--color-primary-foreground` | `#16140f` | `#ede9e0` (primary)| Button text | **14.9:1** | AAA |
| `--color-accent` | `#e0a04d` | `#1d1a14` (card) | Highlighting & badges | **8.05:1** | AAA |
| `--color-accent-foreground` | `#16140f` | `#e0a04d` (accent) | Button/badge text | **8.05:1** | AAA |
| `--color-success` | `#4ade80` | `#1d1a14` (card) | Success badge | **10.8:1** | AAA |
| `--color-success-foreground`| `#16140f` | `#4ade80` (success)| Badge text | **10.8:1** | AAA |
| `--color-warning` | `#e0a04d` | `#1d1a14` (card) | Warning badge | **8.05:1** | AAA |
| `--color-destructive` | `#f87171` | `#1d1a14` (card) | Error badge | **5.74:1** | AA |

### Automated Verification

Automated checks are executed via:
- `pnpm run test:contrast`: Runs `frontend/src/test/color-contrast.test.tsx` verifying exact contrast ratios and axe-core contrast rules.
- CI pipeline (`.github/workflows/ci.yml`): Runs the `a11y-contrast` job on every push and pull request.

