import { notFound } from "next/navigation";
import { getMeal, requireHousehold } from "@/lib/data";
import { toEditable } from "@/lib/ingredients";
import { MealForm } from "../../MealForm";
import type { MealInputT } from "../../actions";

export default async function EditMealPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [{ members }, detail] = await Promise.all([requireHousehold(), getMeal(id)]);
  if (!detail) notFound();
  const { meal, variations, ingredients, cook_ids } = detail;

  const initial: MealInputT = {
    id: meal.id,
    name: meal.name,
    kind: meal.kind,
    course: meal.course,
    description: meal.description,
    notes: meal.notes,
    method: meal.method,
    cuisine: meal.cuisine,
    protein: meal.protein,
    effort: meal.effort,
    tags: meal.tags,
    target_interval_days: meal.target_interval_days,
    servings: meal.servings,
    total_minutes: meal.total_minutes,
    weeknight_ok: meal.weeknight_ok,
    batch_friendly: meal.batch_friendly,
    fresh_heavy: meal.fresh_heavy,
    needs_recipe: meal.needs_recipe,
    prep_note: meal.prep_note,
    source_url: meal.source_url,
    source_name: meal.source_name,
    image_url: meal.image_url,
    cook_ids,
    ingredients: ingredients.filter((i) => !i.variation_id).map(toEditable),
    variations: variations.map((v) => ({
      id: v.id,
      name: v.name,
      notes: v.notes,
      method: v.method,
      ingredients: ingredients.filter((i) => i.variation_id === v.id).map(toEditable),
    })),
  };
  return <MealForm initial={initial} members={members} />;
}
