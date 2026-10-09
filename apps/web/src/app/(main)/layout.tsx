import { redirect } from "next/navigation";
import { MobileBar, Sidebar } from "@/components/layout/nav";
import { MeProvider } from "@/features/auth/me-context";
import { getMe } from "@/lib/server-api";

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const me = await getMe();
  if (!me) redirect("/login?expired=1");
  return (
    <MeProvider me={me}>
      <div className="md:flex">
        <Sidebar />
        <MobileBar />
        <main className="min-w-0 flex-1 px-0 pt-4 pb-24 sm:px-4 md:pt-10 md:pb-10">{children}</main>
      </div>
    </MeProvider>
  );
}
