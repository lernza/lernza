import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { HelmetProvider } from "react-helmet-async"
import "./index.css"
import App from "./App.tsx"
import { ToastProvider } from "./components/toast/ToastContext.tsx"
import { ToastContainer } from "./components/toast/ToastContainer.tsx"

if (import.meta.env.DEV) {
  Promise.all([
    import("@axe-core/react"),
    import("react"),
    import("react-dom")
  ]).then(([axe, React, ReactDOM]) => {
    axe.default(React.default, ReactDOM.default, 1000)
  })
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <HelmetProvider>
      <ToastProvider>
        <App />
        <ToastContainer />
      </ToastProvider>
    </HelmetProvider>
  </StrictMode>
)
