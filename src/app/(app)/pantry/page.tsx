import { PantryClient } from "@/components/pantry/PantryClient";
import { getActivePlan, getPantry } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function PantryPage() {
  const [items, plan] = await Promise.all([getPantry(), getActivePlan()]);
  return <PantryClient items={items} planId={plan?.id ?? null} />;
}
