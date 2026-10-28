import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-all duration-150 outline-none focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas disabled:pointer-events-none disabled:opacity-45 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary:
          "bg-accent text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.16),0_10px_30px_-16px_rgba(109,109,251,0.9)] hover:bg-accent-strong active:translate-y-px",
        secondary:
          "border border-line bg-elevated text-ink hover:border-[#2f3646] hover:bg-[#1d2230] active:translate-y-px",
        ghost: "text-muted hover:bg-white/[0.055] hover:text-ink",
        outline:
          "border border-line text-muted hover:border-[#333a4b] hover:text-ink",
        danger:
          "bg-rose-500/90 text-white hover:bg-rose-500 active:translate-y-px",
        "danger-ghost": "text-rose-300/80 hover:bg-rose-500/10 hover:text-rose-200",
      },
      size: {
        sm: "h-8 px-3 text-[13px]",
        md: "h-10 px-4",
        lg: "h-11 px-5 text-[15px]",
        icon: "h-9 w-9",
        "icon-sm": "h-7 w-7 rounded-md [&_svg]:size-3.5",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

type ButtonProps = ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & { asChild?: boolean };

export function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp className={cn(buttonVariants({ variant, size }), className)} {...props} />
  );
}

export { buttonVariants };
