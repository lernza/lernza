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
      strategies: "generateSW",
      registerType: "autoUpdate",
      injectRegister: "auto",

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

      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,woff2,png,jpg,jpeg}"],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts-cache",
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/,
            handler: "CacheFirst",
            options: {
              cacheName: "image-cache",
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
              },
            },
          },
        ],
        skipWaiting: true,
        clientsClaim: true,
      },

      devOptions: {
        enabled: false,
      },
    }),
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Vendor — split heavy framework deps into dedicated chunks
          if (id.includes("node_modules/react-dom") || id.includes("node_modules/react/")) return "vendor-react";
          if (id.includes("node_modules/@stellar/stellar-sdk") || id.includes("node_modules/@stellar/freighter-api")) return "vendor-stellar";
          if (id.includes("node_modules/@tanstack/react-query")) return "vendor-query";
          if (id.includes("node_modules/recharts") || id.includes("node_modules/d3-") || id.includes("node_modules/victory-")) return "vendor-charts";
          if (id.includes("node_modules/framer-motion")) return "vendor-motion";
          if (id.includes("node_modules/lucide-react")) return "vendor-icons";
          if (id.includes("node_modules/@sentry/react")) return "vendor-sentry";

          // Page-level chunks (code-split with React.lazy)
          if (id.includes("/pages/dashboard/") || id.includes("dashboard.tsx")) return "page-dashboard";
          if (id.includes("/pages/quest.tsx") || id.includes("/pages/quest/")) return "page-quest";
          if (id.includes("/pages/create-quest")) return "page-create-quest";
          if (id.includes("/pages/leaderboard.tsx")) return "page-leaderboard";
          if (id.includes("/pages/creator.tsx")) return "page-creator";
          if (id.includes("/pages/profile.tsx")) return "page-profile";

          // Shared UI components used across multiple pages
          if (id.includes("transaction-confirm-dialog.tsx")) return "shared-dialogs";
          if (id.includes("quest-status-badge.tsx") || id.includes("progress-ring.tsx") || id.includes("share-button.tsx")) return "shared-quest-ui";
        },
        assetFileNames: (assetInfo) => {
          // Organize assets by type
          const info = assetInfo.name || ""
          if (/\.(png|jpe?g|svg|gif|webp|avif)$/.test(info)) {
            return "assets/images/[name]-[hash][extname]"
          }
          if (/\.(woff2?|eot|ttf|otf)$/.test(info)) {
            return "assets/fonts/[name]-[hash][extname]"
          }
          return "assets/[name]-[hash][extname]"
        },
      },
    },
    // Warn if any chunk exceeds 244KB (roughly 0.5s on 3G)
    chunkSizeWarningLimit: 244,
    // Enable CSS code splitting
    cssCodeSplit: true,
    // Minify with esbuild (faster) instead of terser
    minify: "esbuild",
    // Generate source maps for production debugging (but not for vendors)
    sourcemap: false,
    // Optimize image assets
    assetsInlineLimit: 4096, // Inline assets smaller than 4KB as base64
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
})
