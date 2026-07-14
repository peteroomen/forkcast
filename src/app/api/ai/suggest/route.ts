/**
 * POST /api/ai/suggest
 * Server-side meal suggestion. Holds the Anthropic key server-side (never in
 * the browser) and enforces the suggest-from-known-library-only rule: any
 * returned meal name that isn't in the library is rejected.
 */
import { anthropic } from "@ai-sdk/anthropic";
import { generateText } from "ai";
import { NextResponse } from "next/server";
import { z } from "zod";
import { SUGGESTION_MODEL, SUGGESTION_SYSTEM_PROMPT } from "@/lib/ai/prompt";
import { buildDigest } from "@/lib/digest";
import { createClient } from "@/lib/supabase/server";
import { aiSuggestionSchema, recipeSchema } from "@/lib/types";

export const runtime = "nodejs";

const requestSchema = z.object({
  cookName: z.string().nullable().optional(),
  quickOnly: z.boolean().optional(),
  weekend: z.boolean().optional(),
  plannedNames: z.array(z.string()).default([]),
});

export async function POST(req: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "AI is not configured (missing ANTHROPIC_API_KEY)." },
      { status: 503 },
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const parsed = requestSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }
  const { cookName, quickOnly, weekend, plannedNames } = parsed.data;

  // Load the library (RLS scopes to the owner) + recent history.
  const { data: recipeRows } = await supabase
    .from("recipes")
    .select("*")
    .order("name");
  const recipes = z.array(recipeSchema).parse(recipeRows ?? []);

  const { data: recentDays } = await supabase
    .from("plan_days")
    .select("recipe_id, recipes(name), date")
    .not("recipe_id", "is", null)
    .order("date", { ascending: false })
    .limit(20);
  type RecentRow = { recipes: { name: string } | { name: string }[] | null };
  const recentNames = ((recentDays ?? []) as RecentRow[])
    .map((d) => (Array.isArray(d.recipes) ? d.recipes[0]?.name : d.recipes?.name))
    .filter((n): n is string => Boolean(n));

  const digest = buildDigest({
    recipes,
    plannedNames,
    recentNames,
    slot: { cookName, quickOnly, weekend },
  });

  const validNames = new Set(recipes.map((r) => r.name.toLowerCase()));

  let text: string;
  try {
    const result = await generateText({
      model: anthropic(SUGGESTION_MODEL),
      system: SUGGESTION_SYSTEM_PROMPT,
      prompt: `${digest}\n\nSuggest one dinner for this slot. JSON only.`,
      maxTokens: 200,
      temperature: 0.7,
    });
    text = result.text;
  } catch {
    return NextResponse.json(
      { error: "AI request failed. Try again." },
      { status: 502 },
    );
  }

  // Parse the model's JSON defensively.
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    return NextResponse.json(
      { error: "Could not parse a suggestion." },
      { status: 502 },
    );
  }
  const candidate = aiSuggestionSchema.safeParse(
    JSON.parse(jsonMatch[0] || "{}"),
  );
  if (!candidate.success) {
    return NextResponse.json(
      { error: "Suggestion had an unexpected shape." },
      { status: 502 },
    );
  }

  // ENFORCE: the suggested meal must exist in the library. Never surface an
  // invented dish.
  if (!validNames.has(candidate.data.meal.toLowerCase())) {
    return NextResponse.json(
      {
        error:
          "The assistant suggested something not in your library, so it was rejected. Add the recipe first, then try again.",
      },
      { status: 422 },
    );
  }

  const matched = recipes.find(
    (r) => r.name.toLowerCase() === candidate.data.meal.toLowerCase(),
  );

  return NextResponse.json({
    meal: matched?.name ?? candidate.data.meal,
    recipe_id: matched?.id ?? null,
    reason: candidate.data.reason,
    time: candidate.data.time ?? matched?.time_minutes ?? null,
  });
}
