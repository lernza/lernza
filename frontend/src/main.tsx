import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { ToastProvider } from "./components/toast/ToastContext.tsx";
import { ToastContainer } from "./components/toast/ToastContainer.tsx";

createRoot(document.getElementById("root")!).render(
    <StrictMode>
        <ToastProvider>
            <App />
            <ToastContainer />
        </ToastProvider>
    </StrictMode>,
);
