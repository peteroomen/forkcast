import { AppShell } from "@/components/AppShell";
import { ShoppingClient } from "@/components/shopping/ShoppingClient";
import { getActivePlan, getShoppingItems } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function ShoppingPage() {
  const plan = await getActivePlan();
  const items = plan ? await getShoppingItems(plan.id) : [];

  return (
    <AppShell>
      <ShoppingClient planId={plan?.id ?? null} items={items} />
    </AppShell>
  );
}
