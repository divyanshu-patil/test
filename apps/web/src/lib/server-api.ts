import "server-only";
import { cookies } from "next/headers";
import type { Me } from "@/types/api";

const API_ORIGIN = process.env.API_ORIGIN ?? "http://localhost:8000";

/** Current user for server rendering; null when signed out or the session is invalid. */
export async function getMe(): Promise<Me | null> {
  const jar = await cookies();
  const session = jar.get("socially_session");
  if (!session) return null;
  const res = await fetch(`${API_ORIGIN}/api/v1/users/me`, {
    headers: { cookie: `socially_session=${session.value}` },
    cache: "no-store",
  });
  if (res.status === 401) return null;
  if (!res.ok) throw new Error(`Failed to load session (${res.status})`);
  return res.json();
}
