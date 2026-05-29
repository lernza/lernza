import { cva } from "class-variance-authority"

export const badgeVariants = cva(
  "inline-flex items-center border-[2px] border-black font-bold transition-colors",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground shadow-[2px_2px_0_var(--color-border)]",
        secondary: "bg-secondary text-secondary-foreground shadow-[2px_2px_0_var(--color-border)]",
        destructive:
          "bg-destructive text-destructive-foreground shadow-[2px_2px_0_var(--color-border)]",
        outline: "bg-transparent text-foreground",
        success: "bg-success text-success-foreground shadow-[2px_2px_0_var(--color-border)]",
        warning: "bg-warning text-warning-foreground shadow-[2px_2px_0_var(--color-border)]",
        verified:
          "bg-background text-foreground shadow-[2px_2px_0_var(--color-border)] ring-1 ring-inset ring-border",
      },
      size: {
        sm: "px-2 py-0.5 text-[10px] leading-none",
        md: "px-3 py-1 text-xs leading-none",
        lg: "px-4 py-1.5 text-sm leading-none",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
    },
  }
)
