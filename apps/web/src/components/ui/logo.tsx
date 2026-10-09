import { site } from "@/lib/site";

export function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`misprint inline-block -rotate-2 font-display text-2xl font-bold tracking-tighter uppercase ${className}`}>
      {site.name}
    </span>
  );
}
