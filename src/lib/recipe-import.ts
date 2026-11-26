/**
 * Pull a recipe out of a web page via its schema.org/Recipe JSON-LD, which
 * RecipeTin Eats (WP Recipe Maker) and most recipe sites publish.
 */
import { formatIngredient, parseIngredient } from "./ingredients";
import { guessSection } from "./sections";

export interface ImportedRecipe {
  name: string;
  description: string | null;
  servings: number | null;
  total_minutes: number | null;
  cuisine: string | null;
  protein: string | null;
  image_url: string | null;
  source_url: string;
  source_name: string | null;
  method: string | null;
  ingredients: { text: string; section: string; optional: boolean }[];
}

const ENTITIES: Record<string, string> = {
  amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", ndash: "–", mdash: "—",
  frac12: "½", frac14: "¼", frac34: "¾", deg: "°", hellip: "…", rsquo: "’", lsquo: "‘",
  rdquo: "”", ldquo: "“",
};

export function decodeHtml(s: string): string {
  return s
    .replace(/<[^>]+>/g, "")
    .replace(/&#(\d+);/g, (_m, d) => String.fromCodePoint(+d))
    .replace(/&#x([0-9a-f]+);/gi, (_m, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&([a-z0-9]+);/gi, (m, n) => ENTITIES[n.toLowerCase()] ?? m)
    .replace(/\s+/g, " ")
    .trim();
}

/** ISO-8601 duration ("PT1H30M") → minutes. */
export function isoMinutes(d: unknown): number | null {
  if (typeof d !== "string") return null;
  const m = d.match(/^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:\d+S)?)?$/i);
  if (!m) return null;
  const mins = (+(m[1] ?? 0)) * 1440 + (+(m[2] ?? 0)) * 60 + +(m[3] ?? 0);
  return mins > 0 ? mins : null;
}

function isRecipe(node: unknown): node is Record<string, unknown> {
  if (!node || typeof node !== "object") return false;
  const t = (node as Record<string, unknown>)["@type"];
  return t === "Recipe" || (Array.isArray(t) && t.includes("Recipe"));
}

export function findRecipeNode(json: unknown): Record<string, unknown> | null {
  if (Array.isArray(json)) {
    for (const item of json) {
      const r = findRecipeNode(item);
      if (r) return r;
    }
    return null;
  }
  if (!json || typeof json !== "object") return null;
  if (isRecipe(json)) return json;
  const graph = (json as Record<string, unknown>)["@graph"];
  if (graph) return findRecipeNode(graph);
  return null;
}

function firstString(v: unknown): string | null {
  if (typeof v === "string") return v;
  if (Array.isArray(v)) return firstString(v[0]);
  if (v && typeof v === "object") {
    const o = v as Record<string, unknown>;
    return firstString(o.url ?? o.name ?? o["@id"]);
  }
  return null;
}

function parseYield(v: unknown): number | null {
  const values = Array.isArray(v) ? v : [v];
  for (const y of values) {
    if (typeof y === "number" && y > 0) return Math.round(y);
    if (typeof y === "string") {
      const m = y.match(/\d+/);
      if (m && +m[0] > 0) return +m[0];
    }
  }
  return null;
}

function instructionsToText(v: unknown): string | null {
  const steps: string[] = [];
  const walk = (node: unknown, heading?: string) => {
    if (!node) return;
    if (typeof node === "string") {
      const t = decodeHtml(node);
      if (t) steps.push(t);
      return;
    }
    if (Array.isArray(node)) {
      node.forEach((n) => walk(n));
      return;
    }
    if (typeof node === "object") {
      const o = node as Record<string, unknown>;
      if (o["@type"] === "HowToSection") {
        const name = typeof o.name === "string" ? decodeHtml(o.name) : heading;
        if (name) steps.push(`## ${name}`);
        walk(o.itemListElement);
        return;
      }
      if (typeof o.text === "string") walk(o.text);
      else if (typeof o.name === "string") walk(o.name);
    }
  };
  walk(v);
  if (!steps.length) return null;
  let n = 0;
  return steps
    .map((s) => (s.startsWith("## ") ? ((n = 0), `\n${s.slice(3)}`) : `${++n}. ${s}`))
    .join("\n")
    .trim();
}

export function extractRecipe(html: string, url: string): ImportedRecipe | null {
  const scripts = html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
  let node: Record<string, unknown> | null = null;
  for (const [, body] of scripts) {
    try {
      node = findRecipeNode(JSON.parse(body.trim()));
    } catch {
      continue;
    }
    if (node) break;
  }
  if (!node) return null;

  const rawIngredients = Array.isArray(node.recipeIngredient) ? node.recipeIngredient : [];
  const ingredients = rawIngredients
    .filter((x): x is string => typeof x === "string")
    .map(decodeHtml)
    .filter(Boolean)
    .map((text) => {
      const parsed = parseIngredient(text);
      return {
        text: parsed.name ? formatIngredient(parsed) : text,
        section: guessSection(parsed.name),
        optional: /\boptional\b/i.test(text),
      };
    });

  let host: string | null = null;
  try {
    host = new URL(url).hostname.replace(/^www\./, "");
  } catch {}
  const publisher = node.publisher as Record<string, unknown> | undefined;
  const author = node.author as Record<string, unknown> | Record<string, unknown>[] | undefined;
  const sourceName =
    host === "recipetineats.com"
      ? "RecipeTin Eats"
      : (typeof publisher?.name === "string" && publisher.name) ||
        (Array.isArray(author) ? firstString(author[0]?.name) : firstString(author?.name)) ||
        host;

  const cuisine = Array.isArray(node.recipeCuisine)
    ? (node.recipeCuisine[0] as string | undefined) ?? null
    : (node.recipeCuisine as string | undefined) ?? null;

  return {
    name: decodeHtml(String(node.name ?? "Untitled recipe")),
    description: typeof node.description === "string" ? decodeHtml(node.description) || null : null,
    servings: parseYield(node.recipeYield),
    total_minutes:
      isoMinutes(node.totalTime) ??
      (((isoMinutes(node.prepTime) ?? 0) + (isoMinutes(node.cookTime) ?? 0)) || null),
    cuisine: cuisine ? decodeHtml(cuisine) : null,
    protein: guessProtein(decodeHtml(String(node.name ?? "")), ingredients.map((i) => i.text)),
    image_url: firstString(node.image),
    source_url: url,
    source_name: sourceName,
    method: instructionsToText(node.recipeInstructions),
    ingredients,
  };
}

export async function importRecipeFromUrl(url: string): Promise<ImportedRecipe> {
  const parsed = new URL(url);
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") throw new Error("That doesn't look like a web link.");
  const res = await fetch(parsed, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; Forkcast/2.0; personal recipe import)",
      Accept: "text/html,application/xhtml+xml",
    },
    redirect: "follow",
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`The site returned ${res.status}.`);
  const html = await res.text();
  const recipe = extractRecipe(html, res.url || url);
  if (!recipe) throw new Error("Couldn't find a recipe on that page.");
  return recipe;
}

const PROTEIN_RULES: [string, RegExp][] = [
  ["chicken", /\bchicken\b/],
  ["beef", /\bbeef\b|\bsteak\b|\bbrisket\b|\bmince\b/],
  ["lamb", /\blamb\b/],
  ["pork", /\bpork\b|\bbacon\b|\bsausages?\b|\bchorizo\b|\bham\b/],
  ["fish", /\bsalmon\b|\bfish\b|\bsnapper\b|\btarakihi\b|\bhoki\b|\btuna\b|\bcod\b/],
  ["seafood", /\bprawns?\b|\bmussels?\b|\bsquid\b|\bscallops?\b/],
];

/** Title first, then the meat/fish ingredients. */
export function guessProtein(name: string, ingredients: string[]): string | null {
  for (const text of [name, ...ingredients]) {
    const t = text.toLowerCase();
    if (/\b(stock|broth|bouillon|powder)\b/.test(t)) continue;
    for (const [p, re] of PROTEIN_RULES) if (re.test(t)) return p;
  }
  return null;
}
