import { LibraryClient } from "@/components/library/LibraryClient";
import { getRecipes } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function LibraryPage() {
  const recipes = await getRecipes();
  return <LibraryClient recipes={recipes} />;
}
