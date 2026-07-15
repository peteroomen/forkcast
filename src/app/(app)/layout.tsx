import { AppShell } from "@/components/AppShell";

/**
 * Layout for all authed app routes. Rendering AppShell here (not in each page)
 * keeps the nav mounted across navigation, so tab switches only swap the main
 * content — paired with loading.tsx for instant feedback.
 */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
