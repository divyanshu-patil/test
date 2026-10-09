"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { ImagePlus, RefreshCw } from "lucide-react";
import { PostCard } from "@/components/post/post-card";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useMe } from "@/features/auth/me-context";
import { ApiError, postsApi } from "@/lib/api";
import type { Post } from "@/types/api";

type State = { posts: Post[]; cursor: string | null; done: boolean; status: "loading" | "idle" | "error"; error?: string };
const initial: State = { posts: [], cursor: null, done: false, status: "loading" };

export function FeedList({ justPosted = false }: { justPosted?: boolean }) {
  const me = useMe();
  const router = useRouter();
  const [state, setState] = useState<State>(initial);
  const [notice, setNotice] = useState(justPosted);
  const inflight = useRef<AbortController | null>(null);
  const sentinel = useRef<HTMLDivElement>(null);

  const load = useCallback(async (cursor: string | null) => {
    inflight.current?.abort();
    const ctrl = new AbortController();
    inflight.current = ctrl;
    setState((s) => ({ ...(cursor ? s : initial), status: "loading" }));
    try {
      const page = await postsApi.feed(cursor, ctrl.signal);
      setState((s) => {
        // Dedupe defensively in case a post was inserted between page loads.
        const seen = new Set(cursor ? s.posts.map((p) => p.id) : []);
        const posts = [...(cursor ? s.posts : []), ...page.items.filter((p) => !seen.has(p.id))];
        return { posts, cursor: page.next_cursor, done: !page.next_cursor, status: "idle" };
      });
    } catch (e) {
      if (ctrl.signal.aborted) return;
      if (e instanceof ApiError && e.status === 401) {
        router.replace("/login?expired=1&next=/feed");
        return;
      }
      setState((s) => ({ ...s, status: "error", error: e instanceof ApiError ? e.message : "Couldn't load posts." }));
    }
  }, [router]);

  useEffect(() => {
    load(null);
    return () => inflight.current?.abort();
  }, [load]);

  // Infinite scroll; the "Load more" button remains as a keyboard/no-IO fallback.
  useEffect(() => {
    const el = sentinel.current;
    if (!el || state.done || state.status !== "idle") return;
    const io = new IntersectionObserver(([entry]) => entry?.isIntersecting && load(state.cursor), { rootMargin: "800px" });
    io.observe(el);
    return () => io.disconnect();
  }, [state.cursor, state.done, state.status, load]);

  const removed = (id: string) => setState((s) => ({ ...s, posts: s.posts.filter((p) => p.id !== id) }));
  const firstLoad = state.status === "loading" && state.posts.length === 0;

  return (
    <div className="mx-auto w-full max-w-[470px]">
      <div className="mb-4 flex items-center justify-between px-4 sm:px-0">
        <h1 className="misprint text-xl font-bold tracking-tight uppercase">Home</h1>
        <button
          type="button"
          onClick={() => load(null)}
          disabled={state.status === "loading"}
          aria-label="Refresh feed"
          className="rounded-full p-2 text-muted hover:bg-subtle hover:text-ink disabled:opacity-50"
        >
          <RefreshCw aria-hidden className="size-5" />
        </button>
      </div>

      {notice && (
        <div className="mb-4 px-4 sm:px-0">
          <Alert tone="success">
            Your post is live.{" "}
            <button type="button" className="underline underline-offset-2" onClick={() => setNotice(false)}>
              Dismiss
            </button>
          </Alert>
        </div>
      )}

      {firstLoad && <FeedSkeleton />}

      {state.status !== "loading" && state.posts.length === 0 && state.status !== "error" && (
        <div className="tape mx-4 rounded-card border border-dashed border-line bg-surface px-6 py-14 text-center shadow-card sm:mx-0">
          <ImagePlus aria-hidden className="mx-auto size-10 text-muted" strokeWidth={1.4} />
          <h2 className="mt-4 font-display text-2xl font-bold uppercase">Nothing here yet</h2>
          <p className="mt-2 text-sm text-muted">Be the first to share a moment.</p>
          <Link
            href="/create"
            className="mt-6 inline-flex h-11 items-center rounded-control bg-primary px-5 text-sm font-semibold text-on-primary transition-[background-color,box-shadow] duration-200 hover:bg-primary-hover hover:shadow-lift active:translate-y-px"
          >
            Create a post
          </Link>
        </div>
      )}

      <div className="flex flex-col gap-6">
        {state.posts.map((p, i) => (
          <PostCard key={p.id} post={p} isOwner={p.author.id === me.id} index={i} onDeleted={removed} />
        ))}
      </div>

      {state.status === "error" && (
        <div className="mt-6 space-y-3 px-4 text-center sm:px-0">
          <Alert>{state.error}</Alert>
          <Button variant="secondary" onClick={() => load(state.posts.length ? state.cursor : null)}>
            Try again
          </Button>
        </div>
      )}

      {state.posts.length > 0 && !state.done && state.status !== "error" && (
        <div ref={sentinel} className="mt-6 flex justify-center">
          <Button variant="ghost" onClick={() => load(state.cursor)} loading={state.status === "loading"}>
            Load more
          </Button>
        </div>
      )}
      {state.done && state.posts.length > 0 && <p className="mt-8 text-center text-sm text-muted">You&apos;re all caught up.</p>}
    </div>
  );
}

function FeedSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading posts" className="flex flex-col gap-6">
      {[0, 1].map((i) => (
        <div key={i} className="overflow-hidden border-y border-line bg-surface sm:rounded-card sm:border">
          <div className="flex items-center gap-3 px-4 py-3">
            <div className="size-[34px] skeleton rounded-md" />
            <div className="h-3 w-32 skeleton rounded" />
          </div>
          <div className="skeleton aspect-square" />
          <div className="space-y-2 px-4 py-4">
            <div className="h-3 w-3/4 skeleton rounded" />
            <div className="h-3 w-1/2 skeleton rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}
