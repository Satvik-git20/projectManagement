"use client";

import type { ComponentProps } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;

type DialogContentProps = ComponentProps<typeof DialogPrimitive.Content> & {
  variant?: "center" | "sheet" | "left";
  showClose?: boolean;
};

export function DialogContent({
  className,
  children,
  variant = "center",
  showClose = true,
  ...props
}: DialogContentProps) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/70 backdrop-blur-[3px] data-[state=open]:animate-fade" />
      <DialogPrimitive.Content
        aria-describedby={undefined}
        className={cn(
          "fixed z-50 border border-line bg-surface shadow-[0_30px_90px_-30px_rgba(0,0,0,0.9)] outline-none",
          variant === "center" &&
            "left-1/2 top-1/2 max-h-[88vh] w-[min(94vw,33rem)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl data-[state=open]:animate-pop",
          variant === "sheet" &&
            "inset-y-0 right-0 h-full w-[min(96vw,35rem)] overflow-y-auto border-r-0 rounded-l-2xl data-[state=open]:animate-rise",
          variant === "left" &&
            "inset-y-0 left-0 h-full w-[min(86vw,19rem)] overflow-y-auto border-l-0 rounded-r-2xl data-[state=open]:animate-rise",
          className,
        )}
        {...props}
      >
        {children}
        {showClose ? (
          <DialogPrimitive.Close
            className="absolute right-4 top-4 grid size-8 place-items-center rounded-md text-faint transition hover:bg-white/5 hover:text-ink"
            aria-label="Close"
          >
            <X className="size-4" />
          </DialogPrimitive.Close>
        ) : null}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

export const DialogTitle = ({
  className,
  ...props
}: ComponentProps<typeof DialogPrimitive.Title>) => (
  <DialogPrimitive.Title
    className={cn("text-base font-semibold tracking-tight text-ink", className)}
    {...props}
  />
);

export const DialogDescription = ({
  className,
  ...props
}: ComponentProps<typeof DialogPrimitive.Description>) => (
  <DialogPrimitive.Description
    className={cn("mt-1 text-sm text-muted", className)}
    {...props}
  />
);
