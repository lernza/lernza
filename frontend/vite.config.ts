import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"
import { VitePWA } from "vite-plugin-pwa"
import path from "path"

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      // Automatically generate and update the service worker on every build.
      strategies: "generateSW",
      registerType: "autoUpdate",
      // Inject the SW registration snippet into index.html automatically.
      injectRegister: "auto",

      // Web App Manifest — satisfies Lighthouse PWA installability checks.
      manifest: {
        name: "Lernza",
        short_name: "Lernza",
        description: "Learn-to-earn quests on Stellar",
        theme_color: "#000000",
        background_color: "#fafaf8",
        display: "standalone",
        start_url: "/",
        icons: [
          {
            src: "/favicon.svg",
            sizes: "any",
            type: "image/svg+xml",
            purpose: "any maskable",
          },
        ],
      },

      // Workbox configuration: what to pre-cache and how to handle runtime.
      workbox: {
        // Pre-cache all Vite-generated assets (JS chunks, CSS, HTML).
        globPatterns: ["**/*.{js,css,html,svg,woff2}"],

        // Runtime caching for Stellar RPC/Horizon API calls.
        runtimeCaching: [],

        // Skip waiting so updated SW activates immediately after the old one
        // is no longer controlling any clients.
        skipWaiting: true,
        clientsClaim: true,
      },

      // Suppress the "vite-plugin-pwa" dev-mode warning.
      devOptions: {
        enabled: false,
      },
    }),
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules/recharts") || id.includes("node_modules/d3-") || id.includes("node_modules/victory-")) return "vendor-charts";
          if (id.includes("node_modules/framer-motion")) return "vendor-motion";
          if (id.includes("landing.tsx")) return "page-landing";
          if (id.includes("dashboard.tsx") && !id.includes("dashboard/")) return "page-dashboard";
          if (id.includes("pages/dashboard/")) return "page-dashboard-sub";
          if (id.includes("quest.tsx")) return "page-quest";
          if (id.includes("profile.tsx")) return "page-profile";
          if (id.includes("create-quest")) return "page-create-quest";
          if (id.includes("leaderboard.tsx")) return "page-leaderboard";
          if (id.includes("transaction-confirm-dialog.tsx")) return "dialog-transaction";
        },
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
})
