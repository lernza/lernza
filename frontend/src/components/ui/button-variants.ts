import { cva } from "class-variance-authority"

export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 font-bold cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground border-[3px] border-black shadow-[4px_4px_0_#000] hover:shadow-[6px_6px_0_#000] active:shadow-[1px_1px_0_#000] neo-press",
        secondary:
          "bg-white text-foreground border-[3px] border-black shadow-[4px_4px_0_#000] hover:shadow-[6px_6px_0_#000] active:shadow-[1px_1px_0_#000] neo-press",
        destructive:
          "bg-destructive text-destructive-foreground border-[3px] border-black shadow-[4px_4px_0_#000] hover:shadow-[6px_6px_0_#000] active:shadow-[1px_1px_0_#000] neo-press",
        danger:
          "bg-destructive text-destructive-foreground border-[3px] border-black shadow-[4px_4px_0_#000] hover:bg-destructive/90 hover:shadow-[6px_6px_0_#000] active:shadow-[1px_1px_0_#000] neo-press",
        outline:
          "bg-transparent text-foreground border-[3px] border-black shadow-[4px_4px_0_#000] hover:shadow-[6px_6px_0_#000] active:shadow-[1px_1px_0_#000] neo-press",
        ghost:
          "border-0 shadow-none hover:bg-secondary transition-colors",
        link:
          "border-0 shadow-none underline-offset-4 hover:underline text-foreground",
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
