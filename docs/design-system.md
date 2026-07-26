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
