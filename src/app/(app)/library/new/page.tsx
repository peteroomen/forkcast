import { requireHousehold } from "@/lib/data";
import { MealForm } from "../MealForm";
import type { MealInputT } from "../actions";

export const metadata = { title: "Add a meal · Forkcast" };

export default async function NewMealPage({ searchParams }: { searchParams: Promise<{ import?: string }> }) {
  const [{ members, household }, sp] = await Promise.all([requireHousehold(), searchParams]);
  const blank: MealInputT = {
    name: "",
    kind: "head",
    course: "main",
    effort: "medium",
    tags: [],
    target_interval_days: 30,
    servings: household.default_servings,
    total_minutes: null,
    weeknight_ok: true,
    batch_friendly: false,
    fresh_heavy: false,
    needs_recipe: false,
    protein: null,
    cook_ids: [],
    ingredients: [],
    variations: [],
  };
  return <MealForm initial={blank} members={members} startWithImport={sp.import === "1"} />;
}
