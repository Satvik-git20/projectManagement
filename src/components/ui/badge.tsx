import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset whitespace-nowrap",
  {
    variants: {
      variant: {
        neutral: "bg-white/[0.04] text-muted ring-white/10",
        accent: "bg-accent/12 text-accent-soft ring-accent/25",
        success: "bg-emerald-500/10 text-emerald-300 ring-emerald-500/25",
        warning: "bg-amber-500/10 text-amber-300 ring-amber-500/25",
        danger: "bg-rose-500/10 text-rose-300 ring-rose-500/25",
        outline: "bg-transparent text-faint ring-line",
      },
    },
    defaultVariants: { variant: "neutral" },
  },
);

export function Badge({
  className,
  variant,
  ...props
}: ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}
