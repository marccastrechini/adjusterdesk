import { brandMonogram } from "@/lib/brand";

export function BrandMark({ className = "h-9 w-9" }: { className?: string }) {
  return (
    <span
      className={`relative inline-flex shrink-0 items-center justify-center rounded-md bg-teal-700 font-semibold tracking-tight text-white ${className}`}
      aria-hidden="true"
    >
      <span className="absolute top-1 h-1 w-2.5 rounded-sm bg-white/85" />
      <span className="mt-1 text-[13px] leading-none">{brandMonogram}</span>
    </span>
  );
}
