import { QueryClient } from "@tanstack/react-query"

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 30 * 60_000, // 30 min — prevents cache eviction on short navigation breaks
      retry: 1,
      refetchOnWindowFocus: false,
      // Offline support (#1626): serve cached quest data while disconnected
      // and automatically revalidate + retry queued fetches on reconnect.
      refetchOnReconnect: "always",
      networkMode: "offlineFirst",
    },
    mutations: {
      // Keep mutation attempts alive across reconnects; the offline
      // transaction queue (lib/offline-transaction-queue.ts) replays intents
      // that were created while fully offline.
      networkMode: "offlineFirst",
      retry: 1,
    },
  },
})
