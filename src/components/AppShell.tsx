"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * Responsive app shell.
 * - Mobile (default): fixed bottom tab bar, thumb-reachable (primary use is
 *   one-handed at the shops).
 * - Desktop (lg+): left sidebar.
 */

type NavItem = { href: string; label: string; icon: string };

const NAV: NavItem[] = [
  { href: "/", label: "Home", icon: "🏠" },
  { href: "/planner", label: "Planner", icon: "🗓️" },
  { href: "/library", label: "Library", icon: "📖" },
  { href: "/shopping", label: "Shop", icon: "🛒" },
  { href: "/pantry", label: "Pantry", icon: "🧺" },
];

const MORE: NavItem[] = [
  { href: "/discover", label: "Discover", icon: "✨" },
  { href: "/history", label: "History", icon: "🕘" },
  { href: "/settings", label: "Settings", icon: "⚙️" },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname.startsWith(href);
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-base-300 bg-base-100 p-4 lg:flex">
        <Link href="/" className="mb-6 flex items-center gap-2 px-2">
          <span className="text-2xl">🍴</span>
          <span className="text-xl font-bold tracking-tight">Forkcast</span>
        </Link>
        <nav className="flex flex-col gap-1">
          {[...NAV, ...MORE].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                isActive(pathname, item.href)
                  ? "bg-primary text-primary-content"
                  : "hover:bg-base-200"
              }`}
            >
              <span aria-hidden>{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto px-2 pt-4 text-xs text-base-content/50">
          Plan a fortnight in minutes.
        </div>
      </aside>

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile top bar */}
        <header className="sticky top-0 z-20 flex items-center gap-2 border-b border-base-300 bg-base-100/90 px-4 py-3 backdrop-blur lg:hidden">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-xl">🍴</span>
            <span className="text-lg font-bold tracking-tight">Forkcast</span>
          </Link>
          <Link
            href="/settings"
            className="btn btn-ghost btn-sm btn-circle ml-auto"
            aria-label="Settings"
          >
            ⚙️
          </Link>
        </header>

        <main className="mx-auto w-full max-w-3xl flex-1 px-4 pb-28 pt-4 lg:pb-10 lg:pt-8">
          {children}
        </main>
      </div>

      {/* Mobile bottom tab bar */}
      <nav className="safe-bottom fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-base-300 bg-base-100/95 backdrop-blur lg:hidden">
        {NAV.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center gap-0.5 py-2 text-[0.65rem] font-medium ${
                active ? "text-primary" : "text-base-content/60"
              }`}
            >
              <span className="text-lg" aria-hidden>
                {item.icon}
              </span>
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
