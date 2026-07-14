import { AppShell } from "@/components/AppShell";
import { SettingsClient } from "@/components/settings/SettingsClient";
import { getCooks } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const cooks = await getCooks();
  return (
    <AppShell>
      <SettingsClient cooks={cooks} />
    </AppShell>
  );
}
