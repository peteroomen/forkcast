/**
 * Idempotent seed. Stamps every row with OWNER_ID and upserts.
 *   pnpm seed
 * Requires: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, OWNER_ID
 * (service-role bypasses RLS — server-only, never ship this key to the client).
 */
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import {
  SEED_COOKS,
  SEED_FAVOURITE_NAMES,
  SEED_PANTRY,
  SEED_RECIPES,
  type SeedRecipe,
} from "../src/lib/seed-data";

config({ path: ".env.local" });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ownerId = process.env.OWNER_ID;

if (!url || !serviceKey || !ownerId) {
  console.error(
    "Missing env. Need NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, OWNER_ID in .env.local",
  );
  process.exit(1);
}

const db = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function recipeRow(r: SeedRecipe) {
  return {
    owner_id: ownerId,
    name: r.name,
    cuisine: r.cuisine ?? null,
    source_url: r.source_url ?? null,
    time_minutes: r.time_minutes ?? null,
    servings: r.servings ?? 4,
    ingredients: (r.ingredients ?? []).map((i) => ({
      name: i.name,
      qty: i.qty ?? null,
      unit: i.unit ?? null,
      category: i.category,
    })),
    method: r.method ?? null,
    tags: r.tags ?? [],
    notes: r.notes ?? null,
    cooked_by: r.cooked_by ?? "anyone",
    is_favourite: r.is_favourite ?? false,
    needs_recipe: r.needs_recipe ?? false,
  };
}

async function main() {
  // Cooks
  for (const c of SEED_COOKS) {
    const { error } = await db
      .from("cooks")
      .upsert(
        { owner_id: ownerId, name: c.name, default_night: c.default_night, role: c.role },
        { onConflict: "owner_id,name", ignoreDuplicates: false },
      );
    if (error) console.error("cook", c.name, error.message);
  }
  console.log(`✓ ${SEED_COOKS.length} cooks`);

  // Full recipes
  const fullRows = SEED_RECIPES.map(recipeRow);

  // Favourite names (lightweight; skip any that duplicate a full recipe)
  const existingNames = new Set(
    SEED_RECIPES.map((r) => r.name.toLowerCase()),
  );
  const favRows = SEED_FAVOURITE_NAMES.filter(
    (f) => !existingNames.has(f.name.toLowerCase()),
  ).map((f) =>
    recipeRow({
      name: f.name,
      cuisine: f.cuisine,
      is_favourite: true,
      needs_recipe: true,
    }),
  );

  const allRecipes = [...fullRows, ...favRows];
  const { error: recErr } = await db
    .from("recipes")
    .upsert(allRecipes, { onConflict: "owner_id,name", ignoreDuplicates: true });
  if (recErr) console.error("recipes", recErr.message);
  else console.log(`✓ ${allRecipes.length} recipes (${fullRows.length} full + ${favRows.length} favourites-by-name)`);

  // Pantry baseline
  const pantryRows = SEED_PANTRY.map((p) => ({ owner_id: ownerId, ...p, qty: null }));
  const { error: panErr } = await db
    .from("pantry_items")
    .upsert(pantryRows, { onConflict: "owner_id,name", ignoreDuplicates: true });
  if (panErr) console.error("pantry", panErr.message);
  else console.log(`✓ ${pantryRows.length} pantry items`);

  console.log("\nSeed complete.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
