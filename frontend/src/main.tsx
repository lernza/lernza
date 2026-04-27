import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { QueryClientProvider } from "@tanstack/react-query"
import { HelmetProvider } from "react-helmet-async"
import { queryClient } from "@/lib/query-client"
import "./index.css"
import App from "./App.tsx"

if (import.meta.env.DEV) {
  Promise.all([import("@axe-core/react"), import("react"), import("react-dom")]).then(
    ([axe, React, ReactDOM]) => {
      axe.default(React.default, ReactDOM.default, 1000)
    }
  )
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <HelmetProvider>
        <App />
      </HelmetProvider>
    </QueryClientProvider>
  </StrictMode>
)
