"use client";

import { useEffect, useRef, useState, type FormEvent, type RefObject } from "react";
import { Trash2 } from "lucide-react";
import { ApiError, engagementApi } from "@/lib/api";
import { relativeTime } from "@/lib/format";
import type { Comment } from "@/types/api";

export const MAX_COMMENT = 2200;

type Props = {
  postId: string;
  expanded: boolean;
  inputRef: RefObject<HTMLInputElement | null>;
  onCountChange: (delta: number) => void;
};

export function CommentThread({ postId, expanded, inputRef, onCountChange }: Props) {
  const [items, setItems] = useState<Comment[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [loaded, setLoaded] = useState(false);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abort = useRef<AbortController | null>(null);

  async function load(next: string | null) {
    abort.current?.abort();
    const ctrl = new AbortController();
    abort.current = ctrl;
    setStatus("loading");
    try {
      const page = await engagementApi.comments(postId, next, ctrl.signal);
      setItems((cur) => {
        const seen = new Set(next ? cur.map((c) => c.id) : []);
        return [...(next ? cur : []), ...page.items.filter((c) => !seen.has(c.id))];
      });
      setCursor(page.next_cursor);
      setLoaded(true);
      setStatus("idle");
    } catch {
      if (!ctrl.signal.aborted) setStatus("error");
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch the thread when first expanded
    if (expanded && !loaded) load(null);
    return () => abort.current?.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load is stable for this postId
  }, [expanded, loaded, postId]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const text = body.trim();
    if (!text || sending) return;
    setSending(true);
    setError(null);
    try {
      const created = await engagementApi.addComment(postId, text);
      setItems((cur) => [...cur, created]);
      setBody("");
      onCountChange(1);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't post your comment.");
    } finally {
      setSending(false);
    }
  }

  async function remove(c: Comment) {
    setItems((cur) => cur.filter((x) => x.id !== c.id));
    onCountChange(-1);
    try {
      await engagementApi.deleteComment(c.id);
    } catch (err) {
      setItems((cur) => [...cur, c].sort((a, b) => a.created_at.localeCompare(b.created_at)));
      onCountChange(1);
      setError(err instanceof ApiError ? err.message : "Couldn't delete the comment.");
    }
  }

  return (
    <div className="px-4 pb-4">
      {expanded && (
        <div aria-live="polite">
          {status === "loading" && items.length === 0 && (
            <div aria-busy="true" aria-label="Loading comments" className="space-y-2 py-2">
              <div className="skeleton h-3 w-2/3 rounded" />
              <div className="skeleton h-3 w-1/2 rounded" />
            </div>
          )}
          {status === "error" && (
            <p role="alert" className="py-2 text-sm text-danger">
              Couldn&apos;t load comments.{" "}
              <button type="button" className="font-semibold underline" onClick={() => load(loaded ? cursor : null)}>
                Retry
              </button>
            </p>
          )}
          {loaded && items.length === 0 && status !== "loading" && (
            <p className="py-2 text-sm text-muted">No comments yet. Start the conversation.</p>
          )}
          {items.length > 0 && (
            <ul className="space-y-2 py-2" aria-label="Comments">
              {items.map((c) => (
                <li key={c.id} className="group flex items-start gap-2 text-sm">
                  <p className="min-w-0 flex-1 break-words">
                    <span className="mr-1.5 font-bold">{c.author.username}</span>
                    {c.body}
                    <time dateTime={c.created_at} className="ml-2 text-xs text-muted">
                      {relativeTime(c.created_at)}
                    </time>
                  </p>
                  {c.can_delete && (
                    <button
                      type="button"
                      onClick={() => remove(c)}
                      aria-label={`Delete comment by ${c.author.username}`}
                      className="rounded p-1 text-muted opacity-60 transition-opacity duration-200 group-hover:opacity-100 hover:text-danger focus-visible:opacity-100"
                    >
                      <Trash2 aria-hidden className="size-3.5" />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
          {cursor && status !== "error" && (
            <button
              type="button"
              onClick={() => load(cursor)}
              disabled={status === "loading"}
              className="mb-2 text-sm font-semibold text-muted hover:text-ink disabled:opacity-50"
            >
              {status === "loading" ? "Loading…" : "Load more comments"}
            </button>
          )}
        </div>
      )}

      {error && (
        <p role="alert" className="mb-2 text-sm text-danger">
          {error}
        </p>
      )}
      <form onSubmit={submit} className="flex items-center gap-2 border-t border-dashed border-line pt-3">
        <label htmlFor={`comment-${postId}`} className="sr-only">
          Add a comment
        </label>
        <input
          ref={inputRef}
          id={`comment-${postId}`}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          maxLength={MAX_COMMENT}
          placeholder="Add a comment…"
          autoComplete="off"
          disabled={sending}
          className="h-9 min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted"
        />
        <button
          type="submit"
          disabled={!body.trim() || sending}
          aria-busy={sending || undefined}
          className="text-sm font-bold text-accent uppercase disabled:opacity-40"
        >
          {sending ? "Posting…" : "Post"}
        </button>
      </form>
    </div>
  );
}
