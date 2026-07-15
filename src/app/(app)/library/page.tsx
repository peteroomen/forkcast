import { LibraryClient } from "@/components/library/LibraryClient";
import { getRecipes } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function LibraryPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const [recipes, { filter }] = await Promise.all([getRecipes(), searchParams]);
  return <LibraryClient recipes={recipes} initialFilter={filter} />;
}
