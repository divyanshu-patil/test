import type { User } from "@/types/api";

export function Avatar({ user, size = 36 }: { user: Pick<User, "username" | "display_name">; size?: number }) {
  const letter = (user.display_name || user.username).charAt(0).toUpperCase();
  return (
    <span
      aria-hidden
      style={{ width: size, height: size, fontSize: size * 0.46 }}
      className="inline-flex shrink-0 -rotate-3 items-center justify-center rounded-md border-[1.5px] border-ink bg-danger font-bold text-canvas"
    >
      {letter}
    </span>
  );
}
