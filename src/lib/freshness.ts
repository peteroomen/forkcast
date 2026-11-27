/**
 * Roughly how many days fresh things last in a NZ fridge/bench before they
 * might be past it. Things that keep for weeks (onions, potatoes, carrots,
 * pumpkin) aren't tracked. First match wins.
 */
const SHELF_LIFE: [RegExp, number][] = [
  [/\b(berries|strawberr|raspberr|blueberr)/, 3],
  [/\bavocado|\bavo\b/, 3],
  [/\b(rocket|salad mix|mesclun|baby spinach|spinach|watercress)\b/, 4],
  [/\b(lettuce|cos|iceberg)\b/, 6],
  [/\b(coriander|parsley|basil|mint|dill|chives|tarragon|herbs)\b/, 5],
  [/\bmushrooms?\b/, 5],
  [/\b(bean sprouts?|sprouts)\b/, 3],
  [/\b(spring onions?|scallions?)\b/, 6],
  [/\b(broccoli|broccolini|cauliflower|bok choy|pak choy|asparagus)\b/, 6],
  [/\b(courgettes?|zucchini|cucumbers?|eggplants?)\b/, 7],
  [/\b(tomato(es)?|cherry tomato(es)?)\b/, 7],
  [/\b(capsicums?|peppers?)\b/, 9],
  [/\b(green beans|snow peas|beans)\b/, 6],
  [/\b(bananas?)\b/, 5],
  [/\b(bread|buns?|rolls?|pita|wraps?|naan|baguette|sourdough)\b/, 5],
  [/\b(fish|salmon|prawns?|mussels?)\b/, 2],
];

/** Days it keeps, or null if it lasts long enough not to worry about. */
export function shelfLife(name: string, section: string): number | null {
  if (!["produce", "bakery", "deli", "meat_seafood"].includes(section)) return null;
  const n = name.toLowerCase();
  if (section === "meat_seafood" && !/\b(fish|salmon|prawns?|mussels?)\b/.test(n)) return null; // meat goes in the freezer
  for (const [re, days] of SHELF_LIFE) if (re.test(n)) return days;
  return null;
}
