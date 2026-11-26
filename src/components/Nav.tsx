"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, CalendarDays, Settings, ShoppingBasket } from "lucide-react";

const ITEMS = [
  { href: "/plan", label: "Plan", icon: CalendarDays },
  { href: "/library", label: "Meals", icon: BookOpen },
  { href: "/list", label: "Shopping", icon: ShoppingBasket },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function BottomNav() {
  const path = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
      <ul className="mx-auto grid max-w-md grid-cols-4">
        {ITEMS.map(({ href, label, icon: Icon }) => {
          const on = path.startsWith(href);
          return (
            <li key={href}>
              <Link
                href={href}
                className={`flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium ${on ? "text-brand" : "text-muted"}`}
              >
                <Icon className="size-[22px]" strokeWidth={on ? 2.2 : 1.8} />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function SideNav() {
  const path = usePathname();
  return (
    <ul className="hidden items-center gap-1 md:flex">
      {ITEMS.map(({ href, label, icon: Icon }) => {
        const on = path.startsWith(href);
        return (
          <li key={href}>
            <Link
              href={href}
              className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium ${on ? "bg-brand-soft text-brand" : "text-muted hover:text-ink"}`}
            >
              <Icon className="size-4" /> {label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
