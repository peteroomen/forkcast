"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Utensils } from "lucide-react";
import { PRIMARY_NAV, SECONDARY_NAV, isActive } from "./nav-items";

/**
 * Responsive app shell (rendered once in the (app) layout so it persists
 * across navigation — the nav never re-mounts).
 * - Mobile: daisyUI `dock` bottom nav + slim navbar.
 * - Desktop (lg+): daisyUI `menu` sidebar.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const allNav = [...PRIMARY_NAV, ...SECONDARY_NAV];

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-base-300 bg-base-100 lg:flex">
        <Link
          href="/"
          className="flex items-center gap-2 px-5 py-5 text-xl font-bold tracking-tight"
        >
          <span className="grid size-8 place-items-center rounded-lg bg-primary text-primary-content">
            <Utensils className="size-5" />
          </span>
          Forkcast
        </Link>
        <ul className="menu w-full gap-0.5 px-3">
          {allNav.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={isActive(pathname, item.href) ? "menu-active" : ""}
                >
                  <Icon className="size-4" />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
        <p className="mt-auto px-5 py-4 text-xs text-base-content/50">
          Plan a fortnight in minutes.
        </p>
      </aside>

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile top bar */}
        <div className="navbar sticky top-0 z-20 min-h-0 border-b border-base-300 bg-base-100/90 px-4 py-2 backdrop-blur lg:hidden">
          <Link href="/" className="flex flex-1 items-center gap-2">
            <span className="grid size-7 place-items-center rounded-lg bg-primary text-primary-content">
              <Utensils className="size-4" />
            </span>
            <span className="text-lg font-bold tracking-tight">Forkcast</span>
          </Link>
        </div>

        <main className="mx-auto w-full max-w-3xl flex-1 px-4 pb-28 pt-4 lg:pb-10 lg:pt-8">
          {children}
        </main>
      </div>

      {/* Mobile dock (bottom nav) */}
      <div className="dock border-t border-base-300 bg-base-100 lg:hidden">
        {PRIMARY_NAV.map((item) => {
          const Icon = item.icon;
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={active ? "dock-active text-primary" : ""}
            >
              <Icon className="size-5" />
              <span className="dock-label">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
