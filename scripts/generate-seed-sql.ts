/**
 * Emits an idempotent seed as pure SQL (no network) so it can be applied via
 * the Supabase MCP against the shared personal-apps project. The owner is
 * resolved by email at apply-time inside a DO block — no hardcoded UUID
 * (matches the shared-DB handoff: never hardcode the owner uuid in seed).
 *
 *   pnpm tsx scripts/generate-seed-sql.ts > supabase/seed_forkcast.sql
 *   SEED_OWNER_EMAIL=someone@example.com pnpm tsx scripts/generate-seed-sql.ts
 */
import {
  SEED_COOKS,
  SEED_FAVOURITE_NAMES,
  SEED_PANTRY,
  SEED_RECIPES,
  type SeedRecipe,
} from "../src/lib/seed-data";

const EMAIL = process.env.SEED_OWNER_EMAIL ?? "petertheoomen@gmail.com";

const q = (s: string | null | undefined) =>
  s == null ? "null" : `'${s.replace(/'/g, "''")}'`;
const n = (v: number | null | undefined) => (v == null ? "null" : String(v));
const b = (v: boolean | undefined) => (v ? "true" : "false");
const arr = (xs: string[] | undefined) =>
  xs && xs.length
    ? `array[${xs.map((x) => q(x)).join(",")}]::text[]`
    : `'{}'::text[]`;
const jsonb = (obj: unknown) =>
  `'${JSON.stringify(obj).replace(/'/g, "''")}'::jsonb`;

function recipeValues(r: SeedRecipe): string {
  const ingredients = (r.ingredients ?? []).map((i) => ({
    name: i.name,
    qty: i.qty ?? null,
    unit: i.unit ?? null,
    category: i.category,
  }));
  return `(o, ${q(r.name)}, ${q(r.cuisine ?? null)}, ${q(
    r.source_url ?? null,
  )}, ${n(r.time_minutes ?? null)}, ${n(r.servings ?? 4)}, ${jsonb(
    ingredients,
  )}, ${q(r.method ?? null)}, ${arr(r.tags)}, ${q(r.notes ?? null)}, ${q(
    r.cooked_by ?? "anyone",
  )}, ${b(r.is_favourite)}, ${b(r.needs_recipe)})`;
}

const existingNames = new Set(SEED_RECIPES.map((r) => r.name.toLowerCase()));
const favRecipes: SeedRecipe[] = SEED_FAVOURITE_NAMES.filter(
  (f) => !existingNames.has(f.name.toLowerCase()),
).map((f) => ({
  name: f.name,
  cuisine: f.cuisine,
  is_favourite: true,
  needs_recipe: true,
}));

const allRecipes = [...SEED_RECIPES, ...favRecipes];

const lines: string[] = [];
lines.push("-- Forkcast seed (idempotent). Owner resolved by email at apply time.");
lines.push("do $$");
lines.push("declare o uuid;");
lines.push("begin");
lines.push(`  select id into o from auth.users where email = ${q(EMAIL)} limit 1;`);
lines.push(
  `  if o is null then raise exception 'Owner % not found in auth.users', ${q(EMAIL)}; end if;`,
);

// Cooks
lines.push("");
lines.push("  insert into forkcast.cooks (owner_id, name, default_night, role) values");
lines.push(
  SEED_COOKS.map(
    (c) => `    (o, ${q(c.name)}, ${n(c.default_night)}, ${q(c.role)})`,
  ).join(",\n"),
);
lines.push("  on conflict (owner_id, name) do nothing;");

// Recipes
lines.push("");
lines.push(
  "  insert into forkcast.recipes (owner_id, name, cuisine, source_url, time_minutes, servings, ingredients, method, tags, notes, cooked_by, is_favourite, needs_recipe) values",
);
lines.push(allRecipes.map((r) => "    " + recipeValues(r)).join(",\n"));
lines.push("  on conflict (owner_id, name) do nothing;");

// Pantry
lines.push("");
lines.push(
  "  insert into forkcast.pantry_items (owner_id, name, category, status, is_staple, is_food) values",
);
lines.push(
  SEED_PANTRY.map(
    (p) =>
      `    (o, ${q(p.name)}, ${q(p.category)}, ${q(p.status)}, ${b(
        p.is_staple,
      )}, ${b(p.is_food)})`,
  ).join(",\n"),
);
lines.push("  on conflict (owner_id, name) do nothing;");

lines.push("end $$;");

process.stdout.write(lines.join("\n") + "\n");
