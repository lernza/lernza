# Lernza Frontend

React 19 + TypeScript 5.9 + Vite 8 + Tailwind CSS v4 + shadcn/ui

## Setup

```bash
pnpm install
pnpm dev
```

Open [http://localhost:5173](http://localhost:5173)

## Scripts

| Command        | Description                      |
| -------------- | -------------------------------- |
| `pnpm dev`     | Start dev server with HMR        |
| `pnpm build`   | Type-check + production build    |
| `pnpm lint`    | Run ESLint                       |
| `pnpm preview` | Preview production build locally |

## Public Assets (Deployment)

These files in `frontend/public/` are required for correct branding and link previews:

- `favicon.svg` (browser tab icon; `frontend/index.html` includes a tiny inline fallback)
- `og-image.png` (Open Graph + Twitter share image)
- `logo.svg`, `robots.txt`, `sitemap.xml` (SEO/branding assets)

Builds validate the required asset set via `pnpm run validate:assets` (runs automatically before `pnpm build`).

## Design System

Neo-brutalist design with:

- **Palette:** `#FACC15` (yellow) + `#000000` (black) + `#FFFFFF` (white)
- **Borders:** 2-3px solid black on everything
- **Shadows:** Solid black offset shadows (no blur)
- **Interactions:** `.neo-press` (buttons) and `.neo-lift` (cards) with translate animations
- **Animations:** Fade-in, slide, scale with stagger utilities (`.stagger-1` through `.stagger-8`)

## Structure

```
src/
├── components/
│   ├── ui/              # Button, Card, Badge, Progress (shadcn/ui + neo-brutalism)
│   └── navbar.tsx       # Navigation with wallet status
├── pages/
│   ├── landing.tsx      # Hero, how-it-works, features, CTA
│   ├── dashboard.tsx    # Quest list with stats
│   ├── quest.tsx        # Quest detail (milestones + enrollees)
│   └── profile.tsx      # User profile + earnings history
├── hooks/
│   └── use-wallet.ts    # Freighter wallet integration
├── lib/
│   ├── utils.ts         # cn(), formatTokens()
│   └── mock-data.ts     # Mock data for UI development
├── App.tsx              # Router (URL-based via pushState/popstate)
├── main.tsx             # Entry point
└── index.css            # Design tokens, animations, utilities
```

## Network and Wallet Safety

Uses [Freighter](https://freighter.app) (`@stellar/freighter-api`) for wallet connection. The persistent network indicator reflects the configured Stellar network and the wallet's detected network. Testnet is highlighted as a non-production environment.

Transactions are blocked when Freighter is on a different network from the active build. Switch Freighter to the network shown in the indicator and retry; no signing or submission request is made while the mismatch remains.

This safeguard implements [issue #1508](https://github.com/lernza/lernza/issues/1508).

The environment loader generates one active `.env.local` from `config/development.yaml`, `config/staging.yaml`, or `config/production.yaml`. Contract IDs are read only from that selected configuration together with its `VITE_SOROBAN_NETWORK_PASSPHRASE`; do not mix contract IDs between environment files. Use `node scripts/load-config.mjs <environment> > frontend/.env.local` when changing environments.

## Data Sources (Current State)

The frontend currently uses a **mixed data model**:

- **On-chain contract reads** are already used in some views (for example, dashboard and profile fetch data through the generated contract clients).
- **Mock data** from `src/lib/mock-data.ts` is still used in `src/pages/quest.tsx` for quest detail rendering and local UI state.

This means mock data is **not** fully replaced in production yet.

## Planned Migration to Live Contract Data

The remaining migration work is to remove `mock-data.ts` usage from quest detail flows and source all quest/milestone/enrollee/completion state from contract reads.

Until that migration is complete, treat `mock-data.ts` as an active compatibility layer rather than development-only scaffolding.
