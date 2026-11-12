import { cn } from "@/lib/utils";

/** Full firstnote wordmark (icon + "firstnote" text). Height is set via className. */
export function Logo({ className }: { className?: string }) {
  return (
    <img
      src="/firstnote-logo.png"
      alt="firstnote"
      width={618}
      height={192}
      className={cn("h-8 w-auto shrink-0 select-none object-contain", className)}
      draggable={false}
    />
  );
}

/** Icon-only mark. */
export function LogoMark({ className }: { className?: string }) {
  return <img src="/favicon.png" alt="firstnote" className={cn("size-10 shrink-0 object-contain", className)} />;
}
