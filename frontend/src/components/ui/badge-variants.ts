import { cva } from "class-variance-authority"

export const badgeVariants = cva(
  "inline-flex items-center border-[2px] border-black px-3 py-1 text-xs font-bold transition-colors",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground shadow-[2px_2px_0_#000]",
        secondary: "bg-secondary text-secondary-foreground shadow-[2px_2px_0_#000]",
        destructive: "bg-destructive text-destructive-foreground shadow-[2px_2px_0_#000]",
        outline: "bg-transparent text-foreground",
        success: "bg-success text-success-foreground shadow-[2px_2px_0_#000]",
        warning: "bg-warning text-warning-foreground shadow-[2px_2px_0_#000]",
        verified: "bg-[#facc15] text-black shadow-[2px_2px_0_#000]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)
