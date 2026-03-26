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

## Wallet

Uses [Freighter](https://freighter.app) (`@stellar/freighter-api`) for wallet connection. Switch to **Testnet** in Freighter settings before connecting.
