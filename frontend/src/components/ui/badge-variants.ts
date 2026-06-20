import { cva } from "class-variance-authority"

export const badgeVariants = cva(
  "inline-flex items-center rounded-full border font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground border-transparent",
        secondary: "bg-secondary text-secondary-foreground border-transparent",
        destructive: "bg-destructive text-destructive-foreground border-transparent",
        outline: "bg-transparent text-foreground border-border",
        success: "bg-success/12 text-success border-success/25",
        warning: "bg-warning/12 text-warning border-warning/25",
        verified: "bg-accent/10 text-accent border-accent/25",
        // Quest status variants
        active: "bg-success/12 text-success border-success/25",
        archived: "bg-muted text-muted-foreground border-border",
        ended: "bg-destructive/12 text-destructive border-destructive/25",
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
