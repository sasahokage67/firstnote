import type { CountryCode } from "@/lib/events";
import { cn } from "@/lib/utils";

const FILE: Record<CountryCode, string> = {
  KZ: "kz.png", US: "us.svg", CA: "ca.svg", RO: "ro.svg", TH: "th.svg", BR: "br.png", GR: "gr.svg", JM: "jm.svg",
};

/** Country flag as an image — emoji flags don't render on Windows. */
export function Flag({ code, className }: { code: CountryCode | null | undefined; className?: string }) {
  if (!code || !FILE[code]) return null;
  return (
    <img
      src={`/flags/${FILE[code]}`}
      alt=""
      aria-hidden="true"
      width={21}
      height={14}
      className={cn("inline-block h-3.5 w-[21px] shrink-0 rounded-[2px] object-cover align-[-2px] ring-1 ring-white/15", className)}
    />
  );
}
