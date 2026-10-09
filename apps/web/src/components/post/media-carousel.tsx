"use client";

import { useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { frameRatio } from "@/lib/format";
import type { Media } from "@/types/api";

export function MediaCarousel({ media, priority }: { media: Media[]; priority?: boolean }) {
  const track = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const first = media[0];
  if (!first) return null;

  const go = (i: number) => {
    const el = track.current;
    if (el) el.scrollTo({ left: i * el.clientWidth, behavior: "smooth" });
  };
  const onScroll = () => {
    const el = track.current;
    if (el) setIndex(Math.round(el.scrollLeft / el.clientWidth));
  };

  return (
    <div className="relative bg-subtle" style={{ aspectRatio: frameRatio(first.width, first.height) }}>
      <div
        ref={track}
        onScroll={onScroll}
        className="flex h-full snap-x snap-mandatory overflow-x-auto [scrollbar-width:none]"
        aria-roledescription={media.length > 1 ? "carousel" : undefined}
      >
        {media.map((m, i) => (
          <div
            key={m.id}
            className="h-full w-full shrink-0 snap-center"
            aria-roledescription={media.length > 1 ? "slide" : undefined}
            aria-label={media.length > 1 ? `${i + 1} of ${media.length}` : undefined}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- auth-gated API media; sized variants via srcSet */}
            <img
              src={m.thumb_url}
              srcSet={`${m.thumb_url} 640w, ${m.url} 1440w`}
              sizes="(max-width: 640px) 100vw, 470px"
              width={m.width}
              height={m.height}
              alt={m.alt_text ?? ""}
              loading={priority && i === 0 ? "eager" : "lazy"}
              decoding="async"
              className="h-full w-full object-cover"
            />
          </div>
        ))}
      </div>
      {media.length > 1 && (
        <>
          {index > 0 && (
            <button
              type="button"
              onClick={() => go(index - 1)}
              aria-label="Previous image"
              className="absolute top-1/2 left-2 -translate-y-1/2 rounded-full bg-surface/90 p-1.5 text-ink shadow"
            >
              <ChevronLeft aria-hidden className="size-4" />
            </button>
          )}
          {index < media.length - 1 && (
            <button
              type="button"
              onClick={() => go(index + 1)}
              aria-label="Next image"
              className="absolute top-1/2 right-2 -translate-y-1/2 rounded-full bg-surface/90 p-1.5 text-ink shadow"
            >
              <ChevronRight aria-hidden className="size-4" />
            </button>
          )}
          <div aria-hidden className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
            {media.map((m, i) => (
              <span key={m.id} className={`size-1.5 rounded-full ${i === index ? "bg-canvas" : "bg-canvas/50"}`} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
