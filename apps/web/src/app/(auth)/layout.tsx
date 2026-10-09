import Link from "next/link";
import { Logo } from "@/components/ui/logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <Link href="/" className="mb-8 block text-center">
          <Logo className="text-3xl" />
        </Link>
        <div className="tape rounded-card border border-line bg-surface p-6 shadow-card sm:p-8">{children}</div>
      </div>
    </main>
  );
}
