import {
  BookOpen,
  CalendarDays,
  Clock,
  House,
  Package,
  Settings,
  ShoppingCart,
  Sparkles,
  type LucideIcon,
} from "lucide-react";

export type NavItem = { href: string; label: string; icon: LucideIcon };

/** Primary destinations — shown in the mobile dock + sidebar. */
export const PRIMARY_NAV: NavItem[] = [
  { href: "/", label: "Home", icon: House },
  { href: "/planner", label: "Planner", icon: CalendarDays },
  { href: "/library", label: "Library", icon: BookOpen },
  { href: "/shopping", label: "Shop", icon: ShoppingCart },
  { href: "/pantry", label: "Pantry", icon: Package },
];

/** Secondary destinations — sidebar only (mobile reaches them via Home/Settings). */
export const SECONDARY_NAV: NavItem[] = [
  { href: "/discover", label: "Discover", icon: Sparkles },
  { href: "/history", label: "History", icon: Clock },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname.startsWith(href);
}
