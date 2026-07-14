/**
 * AI grounding (RAG-lite). Build a compact digest of the household state and
 * inject it into the system prompt — never dump raw rows into the model.
 *
 * The digest is what lets the AI suggest a MEAL NAME from the known library
 * without seeing (or inventing) full ingredient lists.
 */
import { JAMIE_MAX_MINUTES } from "./constants";
import type { Recipe } from "./types";

export type DigestInput = {
  recipes: Recipe[];
  /** Names planned in the current fortnight so far (avoid repeats). */
  plannedNames: string[];
  /** Recently cooked names from history (avoid repeating too soon). */
  recentNames: string[];
  /** Slot context, if the request is for a specific night. */
  slot?: {
    cookName?: string | null;
    quickOnly?: boolean; // Jamie's nights
    weekend?: boolean;
  };
};

/** Compact newline-delimited digest for the system prompt. */
export function buildDigest(input: DigestInput): string {
  const { recipes, plannedNames, recentNames, slot } = input;

  const favourites = recipes.filter((r) => r.is_favourite).map((r) => r.name);
  const quick = recipes
    .filter((r) => r.time_minutes != null && r.time_minutes <= JAMIE_MAX_MINUTES)
    .map((r) => r.name);
  const kidFriendly = recipes
    .filter((r) => r.tags.includes("kid-friendly"))
    .map((r) => r.name);
  const weekend = recipes
    .filter((r) => r.tags.includes("weekend-cook"))
    .map((r) => r.name);

  const lines: string[] = [];
  lines.push(`LIBRARY (${recipes.length} recipes — you may ONLY suggest names from this list):`);
  lines.push(recipes.map((r) => r.name).join(", "));
  lines.push("");
  lines.push(`FAVOURITES: ${favourites.join(", ") || "—"}`);
  lines.push(`QUICK (<=${JAMIE_MAX_MINUTES} min): ${quick.join(", ") || "—"}`);
  lines.push(`KID-FRIENDLY: ${kidFriendly.join(", ") || "—"}`);
  lines.push(`WEEKEND / BIG-LIFT: ${weekend.join(", ") || "—"}`);
  lines.push("");
  lines.push(`ALREADY PLANNED THIS FORTNIGHT (do not repeat): ${plannedNames.join(", ") || "none"}`);
  lines.push(`RECENTLY COOKED (avoid repeating too soon): ${recentNames.join(", ") || "none"}`);

  if (slot) {
    lines.push("");
    lines.push("THIS SLOT:");
    if (slot.cookName) lines.push(`- Cook: ${slot.cookName}`);
    if (slot.quickOnly) lines.push(`- Must be <= ${JAMIE_MAX_MINUTES} min (Jamie's night).`);
    if (slot.weekend) lines.push("- Weekend slot — a big-lift meal is welcome.");
  }

  return lines.join("\n");
}
