"use client";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="flex min-h-[60dvh] flex-col items-center justify-center px-4 text-center">
      <h1 className="text-2xl font-semibold">Something went wrong</h1>
      <p className="mt-2 text-muted">The server may be unavailable. Please try again.</p>
      <button
        type="button"
        onClick={reset}
        className="mt-6 h-11 rounded-control border border-line bg-surface px-5 font-semibold hover:bg-subtle"
      >
        Try again
      </button>
    </main>
  );
}
