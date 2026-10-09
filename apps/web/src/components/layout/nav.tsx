"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { Home, LogOut, PlusSquare } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Logo } from "@/components/ui/logo";
import { useMe } from "@/features/auth/me-context";
import { authApi } from "@/lib/api";

const links = [
  { href: "/feed", label: "Home", icon: Home },
  { href: "/create", label: "Create", icon: PlusSquare },
];

function useLogout() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  async function logout() {
    setPending(true);
    try {
      await authApi.logout();
    } finally {
      router.replace("/login");
      router.refresh();
    }
  }
  return { logout, pending };
}

export function Sidebar() {
  const pathname = usePathname();
  const me = useMe();
  const { logout, pending } = useLogout();
  return (
    <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-dashed border-line px-4 py-8 md:flex">
      <Link href="/feed" className="mb-10 px-3">
        <Logo />
      </Link>
      <nav aria-label="Primary" className="flex flex-col gap-1">
        {links.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={`flex items-center gap-3 rounded-control border-l-4 px-3 py-3 text-[15px] uppercase tracking-wide transition-colors duration-200 hover:bg-subtle ${active ? "border-accent font-medium" : "border-transparent"}`}
            >
              <Icon aria-hidden className="size-6" strokeWidth={active ? 2.4 : 1.8} />
              {label}
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto flex items-center gap-3 px-3">
        <Avatar user={me} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{me.username}</p>
          {me.display_name && <p className="truncate text-xs text-muted">{me.display_name}</p>}
        </div>
        <button
          type="button"
          onClick={logout}
          disabled={pending}
          aria-label="Log out"
          title="Log out"
          className="rounded-control p-2 text-muted hover:bg-subtle hover:text-ink disabled:opacity-50"
        >
          <LogOut aria-hidden className="size-5" />
        </button>
      </div>
    </aside>
  );
}

export function MobileBar() {
  const pathname = usePathname();
  const { logout, pending } = useLogout();
  return (
    <>
      <header className="sticky top-0 z-[100] flex h-14 items-center justify-between border-b border-line bg-canvas/90 px-4 backdrop-blur md:hidden">
        <Logo className="text-xl" />
        <button
          type="button"
          onClick={logout}
          disabled={pending}
          aria-label="Log out"
          className="rounded-control p-2 text-muted hover:bg-subtle disabled:opacity-50"
        >
          <LogOut aria-hidden className="size-5" />
        </button>
      </header>
      <nav
        aria-label="Primary"
        className="fixed inset-x-0 bottom-0 z-[100] flex h-16 items-stretch justify-around border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] md:hidden"
      >
        {links.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className="flex flex-1 flex-col items-center justify-center gap-0.5 text-xs"
            >
              <Icon aria-hidden className={`size-6 ${active ? "text-accent" : ""}`} strokeWidth={active ? 2.4 : 1.8} />
              <span className={active ? "font-medium text-accent" : "text-muted"}>{label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
