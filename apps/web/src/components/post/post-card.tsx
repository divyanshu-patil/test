"use client";

import { useRef, useState } from "react";
import { MoreHorizontal, Trash2 } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ApiError, postsApi } from "@/lib/api";
import { captionParts, relativeTime } from "@/lib/format";
import type { Post } from "@/types/api";
import { CommentThread } from "@/features/comments/comment-thread";
import { MediaCarousel } from "./media-carousel";
import { PostActions } from "./post-actions";

type Props = { post: Post; isOwner: boolean; index?: number; onDeleted: (id: string) => void };

export function PostCard({ post, isOwner, index = 0, onDeleted }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const commentInput = useRef<HTMLInputElement>(null);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [commentCount, setCommentCount] = useState(post.comment_count);
  const priority = index === 0;
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const name = post.author.display_name || post.author.username;

  async function remove() {
    setDeleting(true);
    setError(null);
    try {
      await postsApi.remove(post.id);
      dialog.current?.close();
      onDeleted(post.id);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Couldn't delete the post.");
      setDeleting(false);
    }
  }

  return (
    <article
      aria-label={`Post by ${name}`}
      style={{ animationDelay: `${Math.min(index, 5) * 80}ms` }}
      className="animate-fade-up overflow-hidden border-y border-line bg-surface shadow-card sm:rounded-card sm:border"
    >
      <header className="flex items-center gap-3 px-4 py-3">
        <Avatar user={post.author} size={34} />
        <div className="min-w-0 flex-1 leading-tight">
          <p className="truncate text-sm font-bold">{post.author.username}</p>
          <time dateTime={post.created_at} title={new Date(post.created_at).toLocaleString()} className="text-xs text-muted">
            {relativeTime(post.created_at)}
          </time>
        </div>
        {isOwner && (
          <button
            type="button"
            onClick={() => dialog.current?.showModal()}
            aria-label="Post options"
            className="rounded-full p-2 text-muted hover:bg-subtle hover:text-ink"
          >
            <MoreHorizontal aria-hidden className="size-5" />
          </button>
        )}
      </header>
      <MediaCarousel media={post.media} priority={priority} />
      <PostActions
        postId={post.id}
        initialLiked={post.viewer_has_liked}
        initialCount={post.like_count}
        commentsOpen={commentsOpen}
        onComment={() => {
          setCommentsOpen(true);
          requestAnimationFrame(() => commentInput.current?.focus());
        }}
      />
      {post.caption && (
        <p className="px-4 pt-1 pb-2 text-[15px] leading-relaxed break-words whitespace-pre-line">
          <span className="mr-1.5 font-bold">{post.author.username}</span>
          {captionParts(post.caption).map((p, i) =>
            p.tag ? (
              <span key={i} className="font-medium text-accent">
                {p.text}
              </span>
            ) : (
              p.text
            ),
          )}
        </p>
      )}
      {commentCount > 0 && !commentsOpen && (
        <button
          type="button"
          onClick={() => setCommentsOpen(true)}
          className="px-4 pb-2 text-sm text-muted hover:text-ink"
        >
          {commentCount === 1 ? "View 1 comment" : `View all ${commentCount} comments`}
        </button>
      )}
      <CommentThread
        postId={post.id}
        expanded={commentsOpen}
        inputRef={commentInput}
        onCountChange={(d) => setCommentCount((c) => c + d)}
      />
      {isOwner && (
        <dialog
          ref={dialog}
          aria-labelledby={`del-${post.id}`}
          className="m-auto w-[min(92vw,22rem)] rounded-card border border-line bg-surface p-6 text-ink backdrop:bg-ink/60"
        >
          <h2 id={`del-${post.id}`} className="text-lg font-semibold">
            Delete this post?
          </h2>
          <p className="mt-1 text-sm text-muted">This can&apos;t be undone.</p>
          {error && (
            <p role="alert" className="mt-3 text-sm text-danger">
              {error}
            </p>
          )}
          <div className="mt-6 flex justify-end gap-2">
            <Button variant="secondary" onClick={() => dialog.current?.close()} disabled={deleting}>
              Cancel
            </Button>
            <Button variant="danger" onClick={remove} loading={deleting}>
              <Trash2 aria-hidden className="size-4" /> Delete
            </Button>
          </div>
        </dialog>
      )}
    </article>
  );
}
