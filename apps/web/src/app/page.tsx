import Link from "next/link";
import { Logo } from "@/components/ui/logo";
import { site } from "@/lib/site";

// Zine collage: paper scraps with tape, torn edges and typewriter captions (no external images).
const scraps = [
  { pos: "left-0 top-10 -rotate-6 h-64 w-52", color: "bg-burnt", caption: "roll 01 / basement show" },
  { pos: "right-2 top-0 rotate-3 h-56 w-48", color: "bg-olive", caption: "roll 02 / rooftop" },
  { pos: "left-24 bottom-0 rotate-2 h-60 w-56", color: "bg-accent", caption: "roll 03 / tour van" },
];

export default function Landing() {
  return (
    <div className="mx-auto flex min-h-dvh max-w-[1280px] flex-col px-6">
      <header className="flex items-center justify-between py-6">
        <Logo />
        <Link href="/login" className="rounded-control px-4 py-2 text-sm font-semibold uppercase tracking-wide hover:bg-subtle">
          Log in
        </Link>
      </header>
      <main className="grid flex-1 items-center gap-16 py-[clamp(3rem,6vw,6rem)] md:grid-cols-[1.25fr_1fr]">
        <div>
          <p className="mb-4 inline-block -rotate-1 bg-ink px-2 py-0.5 text-xs font-medium tracking-[0.2em] text-canvas uppercase">
            Issue no. 1 · photos from your people
          </p>
          <h1 className="font-display text-[clamp(2.5rem,5vw,4rem)] leading-[1.02] font-bold tracking-tighter uppercase">
            <span className="block">Share the</span>
            <span className="relative inline-block rotate-1">
              <span aria-hidden className="absolute inset-x-[-0.15em] bottom-[0.1em] h-[0.45em] -rotate-1 bg-highlight/70" />
              <span className="relative">moments</span>
            </span>{" "}
            <span className="misprint block -rotate-1 pl-6">worth keeping.</span>
          </h1>
          <p className="mt-6 max-w-[48ch] text-muted">{site.description}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/register"
              className="inline-flex h-12 items-center rounded-control bg-primary px-6 font-semibold text-on-primary transition-[background-color,box-shadow] duration-200 hover:bg-primary-hover hover:shadow-lift active:translate-y-px"
            >
              Create an account
            </Link>
            <Link
              href="/login"
              className="inline-flex h-12 items-center rounded-control border-[1.5px] border-line px-6 font-semibold transition-colors duration-200 hover:bg-subtle"
            >
              I have an account
            </Link>
          </div>
        </div>
        <div aria-hidden className="relative mx-auto hidden h-[460px] w-full max-w-md md:block">
          {scraps.map((s) => (
            <figure key={s.caption} className={`tape absolute ${s.pos} rounded-sm bg-surface p-2.5 pb-0 shadow-card`}>
              <div className={`torn h-[78%] w-full ${s.color} opacity-90`} />
              <figcaption className="pt-2 text-xs tracking-wide text-ink">{s.caption}</figcaption>
            </figure>
          ))}
        </div>
      </main>
      <footer className="border-t border-dashed border-line py-6 text-sm text-muted">
        © {new Date().getFullYear()} {site.name} — printed on a borrowed photocopier.
      </footer>
    </div>
  );
}
