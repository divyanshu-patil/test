"use client";

import { useState } from "react";
import { Heart, MessageCircle } from "lucide-react";
import { ApiError, engagementApi } from "@/lib/api";

type Props = {
  postId: string;
  initialLiked: boolean;
  initialCount: number;
  commentsOpen: boolean;
  onComment: () => void;
};

export function PostActions({ postId, initialLiked, initialCount, commentsOpen, onComment }: Props) {
  const [like, setLike] = useState({ liked: initialLiked, count: initialCount });
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggle() {
    if (pending) return;
    const prev = like;
    const next = !prev.liked;
    setLike({ liked: next, count: prev.count + (next ? 1 : -1) }); // optimistic
    setPending(true);
    setError(null);
    try {
      const res = await engagementApi.setLike(postId, next);
      setLike({ liked: res.liked, count: res.like_count });
    } catch (e) {
      setLike(prev); // roll back
      setError(e instanceof ApiError ? e.message : "Couldn't update like.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="px-3 pt-2">
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={toggle}
          aria-pressed={like.liked}
          aria-label={like.liked ? "Unlike" : "Like"}
          className="rounded-control p-2 transition-transform duration-200 ease-out hover:bg-subtle active:scale-90"
        >
          <Heart
            aria-hidden
            className={`size-6 transition-colors duration-200 ${like.liked ? "fill-danger text-danger" : ""}`}
            strokeWidth={2}
          />
        </button>
        <button
          type="button"
          onClick={onComment}
          aria-label="Comment"
          aria-expanded={commentsOpen}
          className="rounded-control p-2 transition-colors duration-200 hover:bg-subtle"
        >
          <MessageCircle aria-hidden className="size-6 -scale-x-100" strokeWidth={2} />
        </button>
      </div>
      <p className="px-1 text-sm font-bold" aria-live="polite">
        {like.count === 1 ? "1 like" : `${like.count} likes`}
      </p>
      {error && (
        <p role="alert" className="px-1 text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
