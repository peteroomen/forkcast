import { guessSection, type SectionId } from "./sections";

export interface ParsedIngredient {
  quantity: number | null;
  unit: string | null;
  name: string;
  note: string | null;
}

const FRACTIONS: Record<string, string> = {
  "½": " 1/2", "¼": " 1/4", "¾": " 3/4", "⅓": " 1/3", "⅔": " 2/3",
  "⅛": " 1/8", "⅜": " 3/8", "⅝": " 5/8", "⅞": " 7/8", "⅕": " 1/5",
};

/** Canonical unit for each spelling we recognise. Metric/NZ-first. */
const UNIT_ALIASES: Record<string, string> = {
  g: "g", gm: "g", gms: "g", gram: "g", grams: "g", gr: "g",
  kg: "kg", kgs: "kg", kilo: "kg", kilos: "kg", kilogram: "kg", kilograms: "kg",
  ml: "ml", millilitre: "ml", millilitres: "ml", milliliter: "ml", milliliters: "ml",
  l: "l", litre: "l", litres: "l", liter: "l", liters: "l",
  tbsp: "tbsp", tbs: "tbsp", tbl: "tbsp", tablespoon: "tbsp", tablespoons: "tbsp",
  tsp: "tsp", teaspoon: "tsp", teaspoons: "tsp",
  cup: "cup", cups: "cup",
  clove: "clove", cloves: "clove",
  tin: "tin", tins: "tin", can: "tin", cans: "tin",
  pkt: "pkt", pkts: "pkt", packet: "pkt", packets: "pkt", pack: "pkt", packs: "pkt",
  bunch: "bunch", bunches: "bunch",
  handful: "handful", handfuls: "handful",
  pinch: "pinch", pinches: "pinch",
  slice: "slice", slices: "slice",
  sheet: "sheet", sheets: "sheet",
  sprig: "sprig", sprigs: "sprig",
  stalk: "stalk", stalks: "stalk",
  head: "head", heads: "head",
  jar: "jar", jars: "jar",
  bag: "bag", bags: "bag",
  large: "large", medium: "medium", small: "small",
};

// Countable units that read better pluralised ("2 cloves").
const PLURAL: Record<string, string> = {
  clove: "cloves", tin: "tins", bunch: "bunches", handful: "handfuls", slice: "slices",
  sheet: "sheets", sprig: "sprigs", stalk: "stalks", head: "heads", jar: "jars", bag: "bags",
  cup: "cups", pinch: "pinches",
};

/** US → NZ supermarket names. Applied to whole words in the ingredient name. */
const NZ_NAMES: [RegExp, string][] = [
  [/\bground (beef|pork|chicken|lamb|turkey)\b/g, "$1 mince"],
  [/\bbell peppers?\b/g, "capsicum"],
  [/\b(red|green|yellow|orange) peppers?\b/g, "$1 capsicum"],
  [/\bcilantro\b/g, "coriander"],
  [/\b(scallions?|green onions?)\b/g, "spring onions"],
  [/\bzucchinis?\b/g, "courgette"],
  [/\bheavy cream\b|\bthickened cream\b|\bwhipping cream\b/g, "cream"],
  [/\ball[- ]purpose flour\b/g, "plain flour"],
  [/\bcornstarch\b/g, "cornflour"],
  [/\bpowdered sugar\b|\bconfectioners'? sugar\b/g, "icing sugar"],
  [/\bsweet potato(es)?\b/g, "kumara"],
  [/\bshrimp\b/g, "prawns"],
  [/\bcanola oil\b|\bvegetable oil\b/g, "canola oil"],
  [/\bchicken breasts? halves\b/g, "chicken breast"],
];

function toNumber(s: string): number | null {
  s = s.trim();
  let m = s.match(/^(\d+)\s+(\d+)\/(\d+)$/);
  if (m) return +m[1] + +m[2] / +m[3];
  m = s.match(/^(\d+)\/(\d+)$/);
  if (m) return +m[1] / +m[2];
  const n = Number(s);
  return Number.isFinite(n) && n > 0 ? n : null;
}

const QTY = String.raw`\d+\s+\d+\/\d+|\d+\/\d+|\d+(?:\.\d+)?`;
const QTY_RE = new RegExp(String.raw`^(${QTY})(?:\s*(?:-|–|to)\s*(${QTY}))?\s*`);
// Imperial echo after a metric amount: "500g / 1 lb", "1 cup (250 ml)", "250ml/8oz".
const ECHO_RE = /^(?:\/\s*[\d.\s/½¼¾⅓⅔]+\s*(?:lbs?|oz|pounds?|ounces?|cups?|fl\.? ?oz|ml|g|tbsp|tsp|"|inch(?:es)?|in)\b\.?\s*|\(\s*[\d.\s/½¼¾⅓⅔]+\s*(?:lbs?|oz|pounds?|ounces?|cups?|fl\.? ?oz|ml|g|tbsp|tsp|litres?|l)\.?\s*\)\s*)/i;

/** Parse "500 g beef mince, finely chopped" into structured parts. */
export function parseIngredient(input: string): ParsedIngredient {
  let s = input.replace(/[½¼¾⅓⅔⅛⅜⅝⅞⅕]/g, (c) => FRACTIONS[c]).replace(/\s+/g, " ").trim();
  s = s.replace(/^[-•*]\s*/, "");
  // "1 lb / 500g beef" → "500g beef"
  s = s.replace(
    /^[\d.\s/]+\s*(?:lbs?|oz|pounds?|ounces?)\.?\s*\/\s*(?=[\d.]+\s*(?:g|kg|ml|l)\b)/i,
    "",
  );

  let quantity: number | null = null;
  const q = s.match(QTY_RE);
  if (q) {
    // For a range ("2-3 cloves") shop for the upper end.
    quantity = toNumber(q[2] ?? q[1]);
    s = s.slice(q[0].length);
  }

  let unit: string | null = null;
  const imperial = s.match(/^(lbs?|pounds?|oz|ounces?)\.?\s+/i);
  if (imperial && quantity !== null) {
    const perUnit = /^o/i.test(imperial[1]) ? 28.35 : 453.6;
    quantity = Math.round(quantity * perUnit);
    unit = "g";
    s = s.slice(imperial[0].length);
  }
  const u = unit ? null : s.match(/^([a-zA-Z]+)\.?(?=[\s,(/]|$)\s*/);
  if (u && UNIT_ALIASES[u[1].toLowerCase()]) {
    // "1 large onion" keeps "large" as a size; "small" etc only count if a name follows.
    unit = UNIT_ALIASES[u[1].toLowerCase()];
    s = s.slice(u[0].length);
  }

  // Drop imperial/metric echoes, possibly repeated.
  for (let i = 0; i < 2; i++) {
    const e = s.match(ECHO_RE);
    if (!e) break;
    s = s.slice(e[0].length);
  }
  s = s.replace(/^of\s+/i, "");

  let note: string | null = null;
  const extracted = extractParens(s);
  s = extracted.rest;
  const notes = [...extracted.parens];
  const comma = s.indexOf(",");
  if (comma > 0) {
    notes.unshift(s.slice(comma + 1));
    s = s.slice(0, comma);
  }
  const cleaned = notes.map(cleanNote).filter(Boolean);
  if (cleaned.length) note = cleaned.join("; ");

  let name = s.trim().replace(/\s+,/g, ",");
  if (!name && note) {
    name = note;
    note = null;
  }
  return { quantity, unit, name: nzName(name), note };
}

/** Split out top-level (possibly nested) parentheticals. */
function extractParens(s: string): { rest: string; parens: string[] } {
  let rest = "";
  const parens: string[] = [];
  let depth = 0;
  let current = "";
  for (const ch of s) {
    if (ch === "(") {
      if (depth > 0) current += ch;
      depth++;
    } else if (ch === ")" && depth > 0) {
      depth--;
      if (depth === 0) {
        parens.push(current);
        current = "";
      } else current += ch;
    } else if (depth > 0) current += ch;
    else rest += ch;
  }
  if (current) parens.push(current);
  return { rest: rest.replace(/\s+/g, " ").replace(/\s+,/g, ",").trim(), parens };
}

function cleanNote(n: string): string {
  let out = n;
  // Drop "(Note 2)"-style references to footnotes on the source page.
  out = out.replace(/\(?\bnotes? \d+\)?/gi, "");
  for (let i = 0; i < 3; i++) {
    out = out.trim().replace(/^[,;\s]+|[,;\s]+$/g, "");
    if (out.startsWith("(") && out.endsWith(")")) out = out.slice(1, -1);
  }
  out = out.replace(/\(\s*\)/g, "").replace(/\s+/g, " ").trim();
  // A bare metric/imperial echo isn't worth keeping.
  if (/^[~\d.\s/½¼¾⅓⅔]+\s*(ml|g|oz|lbs?|cups?|tbsp|tsp)$/i.test(out)) return "";
  return out;
}

export function nzName(name: string): string {
  let n = name;
  const lower = n.toLowerCase();
  let out = lower;
  for (const [re, rep] of NZ_NAMES) out = out.replace(re, rep);
  if (out !== lower) n = out;
  return n;
}

const NICE_FRACTIONS: [number, string][] = [
  [0.125, "⅛"], [0.25, "¼"], [1 / 3, "⅓"], [0.5, "½"], [2 / 3, "⅔"], [0.75, "¾"],
];

export function formatQuantity(input: number, unit: string | null): string {
  let q = input;
  const metric = unit === "g" || unit === "ml";
  if (metric) {
    if (q >= 20) return String(Math.round(q / 5) * 5);
    return String(Math.round(q));
  }
  if (unit === "tsp" || unit === "tbsp" || unit === "cup") {
    const f = q - Math.floor(q);
    const nearThird = Math.abs(f - 1 / 3) < 0.04 || Math.abs(f - 2 / 3) < 0.04;
    if (!nearThird) q = Math.max(0.25, Math.round(q * 4) / 4);
  }
  if (unit === "kg" || unit === "l") return String(Math.round(q * 100) / 100);
  const whole = Math.floor(q);
  const frac = q - whole;
  if (frac < 0.06) return String(whole || q.toFixed(2).replace(/\.?0+$/, ""));
  for (const [v, glyph] of NICE_FRACTIONS) {
    if (Math.abs(frac - v) < 0.06) return whole ? `${whole}${glyph}` : glyph;
  }
  return q.toFixed(1).replace(/\.0$/, "");
}

export function formatUnit(unit: string | null, qty: number | null): string {
  if (!unit) return "";
  if (qty !== null && qty > 1 && PLURAL[unit]) return PLURAL[unit];
  return unit;
}

/** "500 g beef mince (finely chopped)" — the canonical editable text for a line. */
export function formatIngredient(i: { quantity: number | null; unit: string | null; name: string; note?: string | null }): string {
  const parts: string[] = [];
  if (i.quantity !== null) {
    const q = formatQuantity(i.quantity, i.unit);
    const u = formatUnit(i.unit, i.quantity);
    parts.push(u === "g" || u === "kg" || u === "ml" || u === "l" ? `${q}${u}` : u ? `${q} ${u}` : q);
  } else if (i.unit) {
    parts.push(i.unit);
  }
  parts.push(i.name);
  let out = parts.join(" ");
  if (i.note) out += `, ${i.note}`;
  return out;
}

const MEASURED = new Set(["g", "kg", "ml", "l", "tbsp", "tsp", "cup"]);

/**
 * Scale a quantity between serving counts. Measured units scale exactly;
 * countable things (onions, cloves, tins) round to a whole number, never below 1.
 */
export function scaleQuantity(
  q: number | null, fromServings: number | null, toServings: number, unit: string | null = "g",
): number | null {
  if (q === null || !fromServings) return q;
  const scaled = (q * toServings) / fromServings;
  if (unit !== null && MEASURED.has(unit)) return scaled;
  if (q < 1) return scaled; // "½ onion" stays fractional
  return Math.max(1, Math.round(scaled));
}

export interface EditableIngredient {
  text: string;
  section: SectionId | string;
  optional: boolean;
}

export function toEditable(i: { quantity: number | null; unit: string | null; name: string; note: string | null; section: string; optional: boolean }): EditableIngredient {
  return { text: formatIngredient(i), section: i.section, optional: i.optional };
}

export function fromText(text: string): EditableIngredient {
  const p = parseIngredient(text);
  return { text, section: guessSection(p.name), optional: /\boptional\b/i.test(text) };
}
