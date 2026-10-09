/** Only same-site relative paths are allowed as post-login destinations (no open redirects). */
export function safeNext(next: string | null | undefined, fallback = "/feed"): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return fallback;
  return next;
}
