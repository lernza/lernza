import { useToast } from "./ToastContext";
import { motion, AnimatePresence } from "framer-motion";

const variantStyles = {
    success: "bg-green-300 border-green-900 text-black",
    error: "bg-red-300 border-red-900 text-black",
    warning: "bg-yellow-300 border-yellow-900 text-black",
    info: "bg-blue-300 border-blue-900 text-black",
};

export const ToastContainer = () => {
    const { toasts, removeToast } = useToast();

    return (
        <div className="fixed top-4 right-4 z-50 flex flex-col gap-3">
            <AnimatePresence>
                {toasts.map((toast) => (
                    <motion.div
                        key={toast.id}
                        initial={{ opacity: 0, y: -20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, x: 100 }}
                        transition={{ duration: 0.2 }}
                        role="alert"
                        aria-live="assertive"
                        className={`w-80 border-4 shadow-[6px_6px_0px_black] p-4 font-bold ${
                            variantStyles[toast.variant || "info"]
                        }`}
                    >
                        {toast.title && (
                            <div className="text-lg">{toast.title}</div>
                        )}
                        {toast.description && (
                            <div className="text-sm font-medium">
                                {toast.description}
                            </div>
                        )}

                        <button
                            onClick={() => removeToast(toast.id)}
                            className="mt-2 text-xs underline"
                        >
                            Dismiss
                        </button>
                    </motion.div>
                ))}
            </AnimatePresence>
        </div>
    );
};
