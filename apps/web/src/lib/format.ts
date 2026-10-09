const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 31536000],
  ["month", 2592000],
  ["week", 604800],
  ["day", 86400],
  ["hour", 3600],
  ["minute", 60],
];

export function relativeTime(iso: string, now: Date = new Date()): string {
  const seconds = Math.round((new Date(iso).getTime() - now.getTime()) / 1000);
  const fmt = new Intl.RelativeTimeFormat("en", { numeric: "auto", style: "short" });
  for (const [unit, size] of UNITS) {
    if (Math.abs(seconds) >= size) return fmt.format(Math.round(seconds / size), unit);
  }
  return "just now";
}

/** Splits a caption into text and #hashtag tokens for safe rendering (no HTML injection). */
export function captionParts(caption: string): { text: string; tag: boolean }[] {
  return caption
    .split(/(#[\p{L}\p{N}_]{1,50})/u)
    .filter(Boolean)
    .map((text) => ({ text, tag: /^#[\p{L}\p{N}_]+$/u.test(text) }));
}

/** Feed frames are clamped between 4:5 portrait and 1.91:1 landscape. */
export function frameRatio(width: number, height: number): number {
  return Math.min(1.91, Math.max(0.8, width / height));
}
