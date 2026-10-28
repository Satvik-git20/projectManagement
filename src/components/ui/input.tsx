import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export function Input({ className, ...props }: ComponentProps<"input">) {
  return (
    <input
      className={cn(
        "h-10 w-full rounded-lg border border-line bg-raised/70 px-3 text-sm text-ink shadow-inner shadow-black/20 outline-none transition placeholder:text-faint focus:border-accent/60 focus:bg-raised focus:ring-4 focus:ring-accent/12 disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return (
    <textarea
      className={cn(
        "w-full resize-none rounded-lg border border-line bg-raised/70 px-3 py-2.5 text-sm leading-relaxed text-ink shadow-inner shadow-black/20 outline-none transition placeholder:text-faint focus:border-accent/60 focus:bg-raised focus:ring-4 focus:ring-accent/12 disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

export function Label({ className, ...props }: ComponentProps<"label">) {
  return (
    <label
      className={cn(
        "mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.09em] text-faint",
        className,
      )}
      {...props}
    />
  );
}

export function FieldError({ children }: { children?: React.ReactNode }) {
  if (!children) return null;
  return (
    <p role="alert" className="mt-1.5 text-xs text-rose-300">
      {children}
    </p>
  );
}
