import Link from "next/link";
import { Logo } from "@/components/Logo";
import { BottomNav, SideNav } from "@/components/Nav";
import { InstallBanner } from "@/components/InstallBanner";
import { requireHousehold } from "@/lib/data";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  await requireHousehold();
  return (
    <div className="min-h-dvh pb-24 md:pb-10">
      <header className="sticky top-0 z-20 hidden border-b border-line bg-bg/90 backdrop-blur md:block">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3">
          <Link href="/library">
            <Logo small />
          </Link>
          <SideNav />
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 pt-5 md:px-6 md:pt-8">
        <InstallBanner />
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
