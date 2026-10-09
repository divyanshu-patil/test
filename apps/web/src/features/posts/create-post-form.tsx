"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState, type DragEvent, type FormEvent } from "react";
import { ArrowLeft, ArrowRight, ImagePlus, X } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ApiError, postsApi } from "@/lib/api";
import { ACCEPTED, MAX_CAPTION, MAX_FILES, validateFiles } from "./validate";

type Item = { key: string; file: File; url: string; alt: string };

export function CreatePostForm() {
  const router = useRouter();
  const inputId = useId();
  const input = useRef<HTMLInputElement>(null);
  const submitting = useRef(false);
  const [items, setItems] = useState<Item[]>([]);
  const [caption, setCaption] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const [progress, setProgress] = useState<number | null>(null);
  const [dragging, setDragging] = useState(false);

  // Release preview object URLs when the form unmounts.
  const itemsRef = useRef(items);
  useEffect(() => {
    itemsRef.current = items;
  }, [items]);
  useEffect(() => () => itemsRef.current.forEach((i) => URL.revokeObjectURL(i.url)), []);

  function add(files: File[]) {
    const { ok, errors } = validateFiles(items.length, files);
    setErrors(errors);
    setItems((cur) => [...cur, ...ok.map((file) => ({ key: crypto.randomUUID(), file, url: URL.createObjectURL(file), alt: "" }))]);
  }

  function remove(key: string) {
    setItems((cur) => {
      const gone = cur.find((i) => i.key === key);
      if (gone) URL.revokeObjectURL(gone.url);
      return cur.filter((i) => i.key !== key);
    });
  }

  function move(index: number, delta: number) {
    setItems((cur) => {
      const next = [...cur];
      const [it] = next.splice(index, 1);
      if (it) next.splice(index + delta, 0, it);
      return next;
    });
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    setDragging(false);
    add(Array.from(e.dataTransfer.files));
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (submitting.current || items.length === 0) return;
    submitting.current = true;
    setErrors([]);
    setProgress(0);
    const form = new FormData();
    for (const it of items) {
      form.append("files", it.file);
      form.append("alt_texts", it.alt);
    }
    if (caption.trim()) form.append("caption", caption.trim());
    try {
      await postsApi.create(form, setProgress);
      router.push("/feed?posted=1");
      router.refresh();
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        router.replace("/login?expired=1&next=/create");
        return;
      }
      setErrors([err instanceof ApiError ? err.message : "Upload failed."]);
      setProgress(null);
      submitting.current = false;
    }
  }

  const busy = progress !== null;

  return (
    <form onSubmit={onSubmit} className="mx-auto w-full max-w-2xl px-4 sm:px-0" aria-describedby="create-help">
      <h1 className="misprint text-xl font-bold tracking-tight uppercase">New post</h1>
      <p id="create-help" className="mt-1 text-sm text-muted">
        Up to {MAX_FILES} photos · JPEG, PNG, WebP or GIF · 10 MB each
      </p>

      <div className="mt-5 space-y-5 rounded-card border border-line bg-surface p-4 shadow-card sm:p-6">
        {errors.length > 0 && (
          <Alert>
            <ul className="space-y-1">
              {errors.map((er) => (
                <li key={er}>{er}</li>
              ))}
            </ul>
            {busy === false && items.length > 0 && <p className="mt-1">Your photos and caption are kept — you can try again.</p>}
          </Alert>
        )}

        <label
          htmlFor={inputId}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={`flex cursor-pointer flex-col items-center justify-center rounded-card border-2 border-dashed px-6 text-center transition-colors ${items.length ? "py-6" : "py-16"} ${dragging ? "border-accent bg-accent/10" : "border-line hover:bg-subtle"} ${busy || items.length >= MAX_FILES ? "pointer-events-none opacity-50" : ""}`}
        >
          <ImagePlus aria-hidden className="size-9 text-muted" strokeWidth={1.4} />
          <span className="mt-3 font-semibold">{items.length ? "Add more photos" : "Choose photos"}</span>
          <span className="mt-1 text-sm text-muted">or drag them here</span>
          <input
            ref={input}
            id={inputId}
            type="file"
            accept={ACCEPTED.join(",")}
            multiple
            disabled={busy || items.length >= MAX_FILES}
            className="sr-only"
            onChange={(e) => {
              add(Array.from(e.target.files ?? []));
              e.target.value = "";
            }}
          />
        </label>

        {items.length > 0 && (
          <ol className="grid grid-cols-1 gap-4 sm:grid-cols-2" aria-label="Selected photos">
            {items.map((it, i) => (
              <li key={it.key} className="overflow-hidden rounded-control border border-line">
                <div className="relative aspect-square bg-subtle">
                  {/* eslint-disable-next-line @next/next/no-img-element -- local blob preview */}
                  <img src={it.url} alt={it.alt || `Selected photo ${i + 1}`} className="h-full w-full object-cover" />
                  <span className="absolute top-2 left-2 rounded-full bg-ink px-2 py-0.5 text-xs font-semibold text-canvas">
                    {i + 1}
                  </span>
                  <div className="absolute top-2 right-2 flex gap-1">
                    <IconBtn label={`Move photo ${i + 1} earlier`} disabled={busy || i === 0} onClick={() => move(i, -1)}>
                      <ArrowLeft aria-hidden className="size-4" />
                    </IconBtn>
                    <IconBtn label={`Move photo ${i + 1} later`} disabled={busy || i === items.length - 1} onClick={() => move(i, 1)}>
                      <ArrowRight aria-hidden className="size-4" />
                    </IconBtn>
                    <IconBtn label={`Remove photo ${i + 1}`} disabled={busy} onClick={() => remove(it.key)}>
                      <X aria-hidden className="size-4" />
                    </IconBtn>
                  </div>
                </div>
                <label className="block p-2">
                  <span className="sr-only">Alt text for photo {i + 1}</span>
                  <input
                    value={it.alt}
                    maxLength={500}
                    disabled={busy}
                    placeholder="Describe this photo (alt text)"
                    onChange={(e) => setItems((cur) => cur.map((c) => (c.key === it.key ? { ...c, alt: e.target.value } : c)))}
                    className="h-9 w-full rounded-md bg-transparent px-2 text-sm outline-none placeholder:text-muted focus:bg-subtle"
                  />
                </label>
              </li>
            ))}
          </ol>
        )}

        <div>
          <label htmlFor="caption" className="mb-1.5 block text-sm font-medium">
            Caption
          </label>
          <textarea
            id="caption"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            maxLength={MAX_CAPTION}
            rows={4}
            disabled={busy}
            placeholder="Write a caption… add #hashtags"
            aria-describedby="caption-count"
            className="w-full resize-y rounded-control border border-line bg-surface px-3.5 py-3 text-[15px] outline-none placeholder:text-muted focus:border-ink"
          />
          <p id="caption-count" className="mt-1 text-right text-xs text-muted">
            {caption.length}/{MAX_CAPTION}
          </p>
        </div>

        {busy && (
          <div>
            <div className="mb-1.5 flex justify-between text-sm">
              <span>{progress! < 1 ? "Uploading…" : "Processing…"}</span>
              <span aria-hidden>{Math.round(progress! * 100)}%</span>
            </div>
            <progress
              value={progress!}
              max={1}
              aria-label="Upload progress"
              className="h-2 w-full overflow-hidden rounded-full [&::-moz-progress-bar]:bg-primary [&::-webkit-progress-bar]:bg-subtle [&::-webkit-progress-value]:bg-primary"
            />
          </div>
        )}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" disabled={busy} onClick={() => router.back()}>
            Cancel
          </Button>
          <Button type="submit" disabled={items.length === 0} loading={busy}>
            {errors.length && items.length ? "Retry" : "Share"}
          </Button>
        </div>
      </div>
    </form>
  );
}

function IconBtn({ label, children, ...rest }: { label: string; children: React.ReactNode; disabled?: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      {...rest}
      className="rounded-full bg-surface/90 p-1.5 text-ink shadow hover:bg-surface disabled:opacity-40"
    >
      {children}
    </button>
  );
}
