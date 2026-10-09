import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-4 text-center">
      <h1 className="font-display text-4xl font-semibold">Page not found</h1>
      <p className="mt-2 text-muted">The link may be broken, or the page may have been removed.</p>
      <Link href="/" className="mt-6 font-semibold text-accent underline-offset-4 hover:underline">
        Go home
      </Link>
    </main>
  );
}
