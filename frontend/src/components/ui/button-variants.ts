import { cva } from "class-variance-authority"

export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-lg font-semibold cursor-pointer transition-[box-shadow,transform,background-color,border-color,color] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-sm hover:-translate-y-px hover:shadow-md active:translate-y-0 active:shadow-sm",
        secondary:
          "bg-card text-foreground border border-border shadow-sm hover:-translate-y-px hover:bg-secondary hover:shadow-md active:translate-y-0",
        destructive:
          "bg-destructive text-destructive-foreground shadow-sm hover:-translate-y-px hover:bg-destructive/90 hover:shadow-md active:translate-y-0",
        danger:
          "bg-destructive text-destructive-foreground shadow-sm hover:-translate-y-px hover:bg-destructive/90 hover:shadow-md active:translate-y-0",
        outline:
          "bg-transparent text-foreground border border-border hover:border-foreground/25 hover:bg-secondary",
        ghost: "border-0 shadow-none text-foreground hover:bg-secondary",
        link: "border-0 shadow-none text-accent underline-offset-4 hover:underline",
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
