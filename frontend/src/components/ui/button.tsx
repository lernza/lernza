import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 font-bold cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-accent text-primary-foreground border border-border shadow-md hover:shadow-lg active:shadow-sm neo-press",
        secondary:
          // bg-background (white in light, near-black in dark) keeps secondary buttons
          // visually distinct from card surfaces (bg-card) in both modes.
          "bg-background text-foreground border border-border shadow-md hover:shadow-lg active:shadow-sm neo-press",
        destructive:
          "bg-destructive text-destructive-foreground border border-border shadow-md hover:shadow-lg active:shadow-sm neo-press",
        outline:
          "bg-transparent text-foreground border border-border shadow-md hover:shadow-lg active:shadow-sm neo-press",
        ghost: "border-0 shadow-none hover:bg-secondary transition-colors",
        link: "border-0 shadow-none underline-offset-4 hover:underline text-foreground",
      },
      size: {
        default: "h-11 px-5 py-2 text-sm",
        sm: "h-9 px-4 text-xs",
        lg: "h-12 px-8 py-3 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
