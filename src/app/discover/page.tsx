import { AppShell } from "@/components/AppShell";
import { DiscoverClient } from "@/components/discover/DiscoverClient";
import { getRecentMealNames, getRecipes } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function DiscoverPage() {
  const [recipes, recent] = await Promise.all([
    getRecipes(),
    getRecentMealNames(20),
  ]);
  const recentSet = new Set(recent.map((r) => r.toLowerCase()));

  // Surface variety: not recently cooked, favourites and non-favourites mixed,
  // "haven't cooked in a while" first.
  const deck = recipes
    .filter((r) => !r.needs_recipe)
    .map((r) => ({
      recipe: r,
      staleBonus: recentSet.has(r.name.toLowerCase()) ? 0 : 1,
    }))
    .sort((a, b) => b.staleBonus - a.staleBonus)
    .map((x) => x.recipe);

  return (
    <AppShell>
      <DiscoverClient deck={deck} recentNames={recent} />
    </AppShell>
  );
}
