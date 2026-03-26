import { createContext, useContext } from "react";

export type ToastVariant = "success" | "error" | "warning" | "info";

export interface Toast {
    id: string;
    title?: string;
    description?: string;
    variant?: ToastVariant;
    duration?: number;
}

export interface ToastContextType {
    toasts: Toast[];
    showToast: (toast: Omit<Toast, "id">) => void;
    removeToast: (id: string) => void;
}

export const ToastContext = createContext<ToastContextType | null>(null);

export const useToast = () => {
    const ctx = useContext(ToastContext);
    if (!ctx) throw new Error("useToast must be used within ToastProvider");
    return ctx;
};
