/**
 * Seed data — the household's existing recipe library (handoff §8) as
 * structured rows. Ingredients are structured (name/qty/unit/category) so
 * shopping-list consolidation is mechanical.
 *
 * Recipes whose details are still owed by Peter (handoff §10) are seeded with
 * `needs_recipe: true` and no ingredients — the app tracks the "missing recipe"
 * state rather than inventing ingredients.
 *
 * Consumed by scripts/seed.ts (stamps owner_id, upserts).
 */
import type { Category, CookKey, RecipeTag } from "./constants";

export type SeedIngredient = {
  name: string;
  qty?: number | null;
  unit?: string | null;
  category: Category;
};

export type SeedRecipe = {
  name: string;
  cuisine?: string | null;
  source_url?: string | null;
  time_minutes?: number | null;
  servings?: number;
  ingredients?: SeedIngredient[];
  method?: string | null;
  tags?: RecipeTag[];
  notes?: string | null;
  cooked_by?: CookKey;
  is_favourite?: boolean;
  needs_recipe?: boolean;
};

// Day map: 0 = Mon ... 6 = Sun. Confirmed current assignment (handoff §2):
// Jamie = Tuesday (1), Megan = Saturday (5). Editable in Settings.
export const SEED_COOKS = [
  { name: "Peter", default_night: null as number | null, role: "planner" as const },
  { name: "Jamie", default_night: 1, role: "cook" as const },
  { name: "Megan", default_night: 5, role: "cook" as const },
];

const P: Category = "Produce";
const M: Category = "Meat & Fish";
const D: Category = "Dairy & Eggs";
const PA: Category = "Pantry";
const F: Category = "Frozen";

// ---------------------------------------------------------------------------
// Peter's originals
// ---------------------------------------------------------------------------
export const SEED_RECIPES: SeedRecipe[] = [
  {
    name: "Moroccan Mince & Rice",
    cuisine: "North African",
    time_minutes: 40,
    servings: 4,
    cooked_by: "peter",
    is_favourite: true,
    tags: ["kid-friendly"],
    ingredients: [
      { name: "canola oil", qty: 2, unit: "tbsp", category: PA },
      { name: "beef mince", qty: 500, unit: "g", category: M },
      { name: "onion", qty: 1, unit: "large", category: P },
      { name: "carrot", qty: 1, unit: "grated", category: P },
      { name: "garlic", qty: 2, unit: "cloves", category: P },
      { name: "white rice", qty: 1, unit: "cup", category: PA },
      { name: "Moroccan spice mix", qty: 4, unit: "tbsp", category: PA },
      { name: "beef stock", qty: 2, unit: "cups", category: PA },
      { name: "dried apricots", qty: 0.5, unit: "cup", category: PA },
      { name: "raisins", qty: 0.5, unit: "cup", category: PA },
      { name: "tomato sauce", qty: 2, unit: "tbsp", category: PA },
      { name: "parsley", qty: null, unit: "garnish", category: P },
      { name: "pine nuts or slivered almonds", qty: null, unit: "toasted", category: PA },
    ],
    method:
      "Brown mince hard until fond forms, remove; sweat onion & carrot 3 min, garlic 30 sec; add rice & spice 1 min; add stock, dried fruit, tomato sauce; boil, cover low 20 min, stand 10 min off heat. Reheat rice in a pan with a splash of water, not the microwave.",
    notes: "Stock only, no water — refined down from the original.",
  },
  {
    name: "Indian Mince & Rice",
    cuisine: "Indian",
    time_minutes: 40,
    servings: 4,
    cooked_by: "peter",
    is_favourite: true,
    tags: ["kid-friendly"],
    ingredients: [
      { name: "beef mince", qty: 500, unit: "g", category: M },
      { name: "onion", qty: 1, unit: "large", category: P },
      { name: "carrot", qty: 1, unit: "grated", category: P },
      { name: "garlic", qty: 2, unit: "cloves", category: P },
      { name: "white rice", qty: 1, unit: "cup", category: PA },
      { name: "cumin", qty: 1, unit: "tsp", category: PA },
      { name: "coriander (ground)", qty: 1, unit: "tsp", category: PA },
      { name: "turmeric", qty: 1, unit: "tsp", category: PA },
      { name: "garam masala", qty: 1, unit: "tsp", category: PA },
      { name: "cinnamon", qty: 0.5, unit: "tsp", category: PA },
      { name: "cardamom", qty: 0.5, unit: "tsp", category: PA },
      { name: "ginger", qty: 0.25, unit: "tsp", category: PA },
      { name: "raisins", qty: 0.5, unit: "cup", category: PA },
      { name: "frozen peas", qty: null, unit: null, category: F },
      { name: "chicken stock", qty: 2, unit: "cups", category: PA },
      { name: "yogurt", qty: 2, unit: "tbsp", category: D },
      { name: "coriander (fresh)", qty: null, unit: "garnish", category: P },
      { name: "cashews", qty: null, unit: "toasted", category: PA },
      { name: "lemon", qty: null, unit: null, category: P },
    ],
    method:
      "Keema-biryani style — same method as Moroccan. Keep raisins, skip apricots; peas added during the stand; yogurt stirred in off heat.",
  },
  {
    name: "Mexican Mince & Rice",
    cuisine: "Mexican",
    time_minutes: 40,
    servings: 4,
    cooked_by: "peter",
    is_favourite: true,
    tags: ["kid-friendly"],
    ingredients: [
      { name: "beef mince", qty: 500, unit: "g", category: M },
      { name: "onion", qty: 1, unit: "large", category: P },
      { name: "carrot", qty: 1, unit: "grated", category: P },
      { name: "garlic", qty: 2, unit: "cloves", category: P },
      { name: "white rice", qty: 1, unit: "cup", category: PA },
      { name: "cumin", qty: 2, unit: "tsp", category: PA },
      { name: "smoked paprika", qty: 1, unit: "tsp", category: PA },
      { name: "oregano", qty: 1, unit: "tsp", category: PA },
      { name: "chipotle powder", qty: 1, unit: "tsp", category: PA },
      { name: "dried cranberries", qty: 0.5, unit: "cup", category: PA },
      { name: "beef stock", qty: 2, unit: "cups", category: PA },
      { name: "tomato paste", qty: 2, unit: "tbsp", category: PA },
      { name: "chipotle in adobo", qty: 1, unit: "tbsp", category: PA },
      { name: "black beans", qty: 0.5, unit: "cup", category: PA },
      { name: "coriander", qty: null, unit: "garnish", category: P },
      { name: "lime", qty: null, unit: null, category: P },
      { name: "sour cream", qty: null, unit: null, category: D },
      { name: "corn chips", qty: null, unit: "crushed", category: PA },
    ],
    method: "Same method as Moroccan. Use ½ tsp chipotle for the kids' portion.",
    notes: "Add black beans with the stock.",
  },
  {
    name: "Chorizo Pitas",
    cuisine: "Mediterranean",
    time_minutes: 30,
    servings: 4,
    cooked_by: "peter",
    is_favourite: true,
    tags: ["kid-friendly", "quick"],
    ingredients: [
      { name: "pita bread", qty: 4, unit: null, category: PA },
      { name: "hummus", qty: null, unit: "store-bought", category: PA },
      { name: "chorizo", qty: null, unit: null, category: M },
      { name: "onion", qty: 1, unit: null, category: P },
      { name: "capsicum", qty: 1, unit: null, category: P },
      { name: "lettuce", qty: null, unit: null, category: P },
      { name: "carrot", qty: 1, unit: null, category: P },
      { name: "tzatziki", qty: null, unit: null, category: D },
    ],
    method:
      "Toast pita, hummus base, chorizo with onions & peppers, lettuce & carrot salad dressed with lemon + olive oil, tzatziki on top.",
    notes: "Family hit. Next time: try roasted peppers instead of fresh for more depth.",
  },
  {
    name: "Kofta Night (Turkish Spread)",
    cuisine: "Turkish",
    time_minutes: null,
    servings: 4,
    cooked_by: "peter",
    is_favourite: true,
    needs_recipe: true,
    tags: ["weekend-cook"],
    ingredients: [
      { name: "tabbouleh", qty: null, unit: "homemade", category: P },
      { name: "hummus", qty: null, unit: "store-bought", category: PA },
      { name: "babaganoush", qty: null, unit: "store-bought", category: PA },
      { name: "flat/Turkish bread", qty: null, unit: null, category: PA },
    ],
    notes:
      "Megan specifically requests this. Kofta recipe still owed by Peter — do not invent (§10). Can repeat back-to-back (e.g. Mon/Wed).",
  },

  // -------------------------------------------------------------------------
  // Saved recipes (ingredients known) — handoff §8 table
  // -------------------------------------------------------------------------
  {
    name: "Honey Soy Chicken",
    cuisine: "Asian",
    time_minutes: 30,
    cooked_by: "anyone",
    is_favourite: true,
    tags: ["quick", "kid-friendly"],
    ingredients: [
      { name: "LKK honey soy sauce packet", qty: 1, unit: null, category: PA },
      { name: "chicken strips", qty: 500, unit: "g", category: M },
      { name: "onion", qty: 100, unit: "g", category: P },
      { name: "green capsicum", qty: 50, unit: "g", category: P },
      { name: "red capsicum", qty: 50, unit: "g", category: P },
      { name: "rice", qty: null, unit: null, category: PA },
    ],
    notes: "Serve with rice.",
  },
  {
    name: "Taco Kit",
    cuisine: "Mexican",
    time_minutes: 25,
    cooked_by: "anyone",
    is_favourite: true,
    tags: ["quick", "kid-friendly"],
    ingredients: [
      { name: "taco kit", qty: 1, unit: null, category: PA },
      { name: "lettuce", qty: null, unit: null, category: P },
      { name: "sour cream", qty: null, unit: null, category: D },
      { name: "onion", qty: 1, unit: null, category: P },
      { name: "beans", qty: 1, unit: "tin", category: PA },
      { name: "beef mince", qty: 500, unit: "g", category: M },
    ],
  },
  {
    name: "Sausages & Mash",
    cuisine: "British",
    time_minutes: 35,
    cooked_by: "anyone",
    is_favourite: true,
    tags: ["kid-friendly"],
    ingredients: [
      { name: "sausages", qty: 1, unit: "pkt", category: M },
      { name: "gravy", qty: 1, unit: "pkt", category: PA },
      { name: "potatoes", qty: 4, unit: "large", category: P },
      { name: "butter", qty: null, unit: null, category: D },
      { name: "milk", qty: null, unit: null, category: D },
    ],
  },
  {
    name: "Butter Chicken Pizza",
    cuisine: "Fusion",
    time_minutes: 30,
    cooked_by: "megan",
    is_favourite: true,
    tags: ["megan-friendly", "kid-friendly", "quick"],
    ingredients: [
      { name: "store-bought pizza bases", qty: 2, unit: null, category: PA },
      { name: "jar tikka/butter-chicken sauce", qty: 1, unit: null, category: PA },
      { name: "chicken breast", qty: 400, unit: "g", category: M },
      { name: "pizza cheese", qty: null, unit: null, category: D },
      { name: "onion", qty: 1, unit: null, category: P },
      { name: "coriander", qty: null, unit: "optional", category: P },
    ],
    notes: "Aka Chicken Tikka Masala Pizza.",
  },
  {
    name: "Korean Bulgogi",
    cuisine: "Korean",
    source_url: "https://www.recipetineats.com/bulgogi-korean-bbq-beef/",
    time_minutes: 30,
    cooked_by: "anyone",
    is_favourite: true,
    tags: ["quick"],
    ingredients: [
      { name: "thin-sliced beef", qty: 400, unit: "g", category: M },
      { name: "scallion", qty: 1, unit: null, category: P },
      { name: "onion", qty: 0.5, unit: null, category: P },
      { name: "carrot", qty: 0.5, unit: null, category: P },
      { name: "soy sauce", qty: 3, unit: "tbsp", category: PA },
      { name: "brown sugar", qty: 1.5, unit: "tbsp", category: PA },
      { name: "mirin", qty: 1, unit: "tbsp", category: PA },
      { name: "sesame oil", qty: 0.5, unit: "tbsp", category: PA },
      { name: "garlic", qty: 2, unit: "cloves", category: P },
      { name: "red apple", qty: 3, unit: "tbsp grated", category: P },
      { name: "ginger", qty: 0.5, unit: "tsp", category: PA },
      { name: "rice", qty: null, unit: null, category: PA },
    ],
    notes: "Serve over rice.",
  },
  {
    name: "Mince & Cheese Pies",
    cuisine: "British",
    time_minutes: 45,
    cooked_by: "megan",
    is_favourite: true,
    tags: ["megan-friendly", "kid-friendly"],
    ingredients: [
      { name: "beef mince", qty: 500, unit: "g", category: M },
      { name: "oxtail soup powder", qty: 1, unit: "pkt", category: PA },
      { name: "onion", qty: 1, unit: null, category: P },
      { name: "pastry sheets", qty: null, unit: null, category: F },
      { name: "melty cheese", qty: null, unit: null, category: D },
    ],
  },
  {
    name: "Spaghetti Bolognaise",
    cuisine: "Italian",
    time_minutes: 40,
    cooked_by: "anyone",
    is_favourite: true,
    tags: ["kid-friendly"],
    ingredients: [
      { name: "beef mince", qty: 500, unit: "g", category: M },
      { name: "onion", qty: 0.5, unit: null, category: P },
      { name: "pasta sauce", qty: 1, unit: "tin", category: PA },
      { name: "spaghetti", qty: null, unit: null, category: PA },
    ],
    notes:
      "Batch-cook to stretch across two nights: pasta one night, gnocchi the next (manages mince quantity). Serve with garlic bread.",
  },
  {
    name: "Roast Chicken",
    cuisine: "Roast",
    time_minutes: 90,
    cooked_by: "peter",
    is_favourite: true,
    tags: ["weekend-cook", "kid-friendly"],
    ingredients: [
      { name: "whole chicken (~1.8kg)", qty: 1, unit: null, category: M },
      { name: "butter", qty: null, unit: null, category: D },
      { name: "lemon", qty: 1, unit: null, category: P },
      { name: "garlic", qty: null, unit: null, category: P },
      { name: "herbs", qty: null, unit: null, category: P },
      { name: "carrots", qty: null, unit: null, category: P },
      { name: "potatoes", qty: null, unit: null, category: P },
    ],
    notes: "Big-lift meal — good for Sunday.",
  },
  {
    name: "Chicken Tenders & Chips",
    cuisine: "Takeaway-style",
    time_minutes: 25,
    cooked_by: "anyone",
    is_favourite: true,
    tags: ["quick", "kid-friendly"],
    ingredients: [
      { name: "frozen tenders", qty: null, unit: null, category: F },
      { name: "frozen chips", qty: null, unit: null, category: F },
      { name: "cooking oil", qty: null, unit: null, category: PA },
    ],
    notes: "Store-bought convenience preferred. Deep fried (need oil).",
  },
  {
    name: "Cheesy Potato Bake",
    cuisine: "Side/Main",
    time_minutes: 60,
    cooked_by: "peter",
    is_favourite: true,
    tags: ["weekend-cook"],
    ingredients: [
      { name: "potatoes", qty: 1.2, unit: "kg", category: P },
      { name: "cream", qty: 300, unit: "ml", category: D },
      { name: "grated cheese", qty: null, unit: null, category: D },
      { name: "garlic", qty: 2, unit: "cloves", category: P },
      { name: "rump steak", qty: null, unit: null, category: M },
    ],
    notes: "Serve with rump steak.",
  },
  {
    name: "Yellow Rice",
    cuisine: "Side",
    time_minutes: 30,
    cooked_by: "peter",
    tags: [],
    ingredients: [
      { name: "onion", qty: 0.5, unit: null, category: P },
      { name: "garlic", qty: 2, unit: "cloves", category: P },
      { name: "capsicum", qty: null, unit: "optional", category: P },
      { name: "turmeric", qty: null, unit: null, category: PA },
      { name: "rice", qty: 1.5, unit: "cups", category: PA },
      { name: "chicken stock", qty: 2.5, unit: "cups", category: PA },
    ],
    notes:
      "Side. Sauté onion/garlic/capsicum, add turmeric, toast rice, cook in rice cooker with stock. Serve with salad, 'sata-oli' (mayo + satay sauce), chicken tenders.",
  },
  {
    name: "Red Braised Chicken (Hongshao Ji)",
    cuisine: "Chinese",
    source_url: "https://thewoksoflife.com/red-braised-chicken/",
    time_minutes: 60,
    cooked_by: "peter",
    tags: ["weekend-cook"],
    ingredients: [
      { name: "bone-in chicken thighs", qty: null, unit: null, category: M },
    ],
    notes:
      "Best with bone-in thighs. Bone-in cutlets may need deboning (cutlets are bone-in, skin-off — braising is fine).",
  },
  {
    name: "Nachos",
    cuisine: "Mexican",
    time_minutes: 30,
    cooked_by: "megan",
    is_favourite: true,
    needs_recipe: true,
    tags: ["megan-friendly", "kid-friendly"],
    notes: "Details in prior notes — confirm ingredients with Peter before finalising.",
  },

  // -------------------------------------------------------------------------
  // Fetched via URL (RecipeTin Eats unless noted). Ingredients mostly at source.
  // -------------------------------------------------------------------------
  {
    name: "Pumpkin Soup",
    cuisine: "Soup",
    source_url: "https://www.recipetineats.com/pumpkin-soup/",
    time_minutes: 40,
    cooked_by: "peter",
    is_favourite: true,
    notes: "Serve with sourdough.",
  },
  {
    name: "Pad See Ew (Beef)",
    cuisine: "Thai",
    source_url: "https://www.recipetineats.com/pad-see-ew-thai-stir-fried-noodles/",
    time_minutes: 30,
    cooked_by: "peter",
    is_favourite: true,
    tags: ["quick"],
  },
  {
    name: "Gyoza",
    cuisine: "Japanese",
    source_url: "https://www.recipetineats.com/gyoza-japanese-dumplings/",
    time_minutes: 45,
    cooked_by: "peter",
    ingredients: [{ name: "gyoza", qty: null, unit: null, category: F }],
  },
  {
    name: "Pho",
    cuisine: "Vietnamese",
    source_url: "https://www.recipetineats.com/vietnamese-pho-recipe/",
    time_minutes: 60,
    cooked_by: "peter",
    ingredients: [
      { name: "beef brisket", qty: null, unit: null, category: M },
      { name: "beef stock (good store-bought)", qty: null, unit: null, category: PA },
    ],
    notes: "Simplified: brisket + good store-bought stock, ~1 hr.",
  },
  {
    name: "Salmon Quiche",
    cuisine: "Seafood",
    source_url: "https://www.recipetineats.com/salmon-quiche/",
    time_minutes: 60,
    cooked_by: "peter",
    notes:
      "Seafood — Peter + eldest-child treat/lunch, NOT a family dinner (§3).",
  },
  {
    name: "Beef Stew",
    cuisine: "Stew",
    source_url: "https://www.recipetineats.com/beef-stew/",
    time_minutes: 150,
    cooked_by: "peter",
    tags: ["weekend-cook"],
    ingredients: [
      { name: "stewing beef", qty: null, unit: null, category: M },
      { name: "parsnip (substitute for celery)", qty: null, unit: null, category: P },
      { name: "carrot", qty: null, unit: null, category: P },
    ],
    notes:
      "⚠️ Original contains celery → substitute parsnip or extra carrot. Flag to Jamie. Big-lift → Sunday.",
  },
  {
    name: "Fish Cooked in Paper",
    cuisine: "Seafood",
    source_url: "https://www.recipetineats.com/fish-en-papillote-baked-fish-in-parchment/",
    time_minutes: 30,
    cooked_by: "peter",
    tags: ["quick"],
    ingredients: [
      { name: "tarakihi fillets", qty: 4, unit: "fresh", category: M },
      { name: "broccolini", qty: null, unit: null, category: P },
    ],
  },
  {
    name: "Lasagna",
    cuisine: "Italian",
    source_url: "https://www.recipetineats.com/lasagna/",
    time_minutes: 90,
    cooked_by: "peter",
    is_favourite: true,
    tags: ["weekend-cook", "kid-friendly"],
    notes: "Big-lift → Sunday.",
  },
  {
    name: "Pumpkin Pie",
    cuisine: "Dessert",
    source_url: "https://www.recipetineats.com/pumpkin-pie/",
    time_minutes: 90,
    cooked_by: "peter",
  },

  // -------------------------------------------------------------------------
  // Jamie's style (≤30 min) — handoff §8
  // -------------------------------------------------------------------------
  {
    name: "Butter Chicken Drumsticks & Green Rice",
    cuisine: "Fusion",
    time_minutes: 30,
    cooked_by: "jamie",
    tags: ["jamie-friendly", "quick", "kid-friendly"],
  },
  {
    name: "Corn + Avo Tacos",
    cuisine: "Mexican",
    time_minutes: 20,
    cooked_by: "jamie",
    tags: ["jamie-friendly", "quick", "kid-friendly"],
  },
  {
    name: "Chicken & Avocado Sushi Rolls (Teriyaki Chicken)",
    cuisine: "Japanese",
    time_minutes: 30,
    cooked_by: "jamie",
    needs_recipe: true,
    tags: ["jamie-friendly", "quick"],
    notes: "Jamie's sushi-roll method still to confirm (§10).",
  },

  // -------------------------------------------------------------------------
  // Megan's repertoire (names — some overlap with above) — handoff §8
  // -------------------------------------------------------------------------
  {
    name: "Lemon Chicken (LKK packet)",
    cuisine: "Asian",
    time_minutes: 30,
    cooked_by: "megan",
    is_favourite: true,
    tags: ["megan-friendly", "quick", "kid-friendly"],
    ingredients: [
      { name: "LKK lemon chicken packet", qty: 1, unit: null, category: PA },
      { name: "chicken breast", qty: 400, unit: "g", category: M },
      { name: "rice", qty: null, unit: null, category: PA },
    ],
  },
  {
    name: "Pasta Bake",
    cuisine: "Italian",
    time_minutes: 45,
    cooked_by: "megan",
    is_favourite: true,
    tags: ["megan-friendly", "kid-friendly"],
  },

  // -------------------------------------------------------------------------
  // Recipes still owed by Peter (§10) — planned by name, no ingredients
  // -------------------------------------------------------------------------
  {
    name: "Pulled Pork Sliders",
    cuisine: "American",
    cooked_by: "peter",
    is_favourite: true,
    needs_recipe: true,
    tags: ["weekend-cook"],
    notes: "Method + preferred cut still owed by Peter (§10).",
  },
  {
    name: "Pineapple Fried Rice",
    cuisine: "Thai",
    cooked_by: "peter",
    is_favourite: true,
    needs_recipe: true,
    notes: "Method still owed by Peter (§10).",
  },
  {
    name: "Gnocchi with Leftover Bolognaise",
    cuisine: "Italian",
    time_minutes: 15,
    cooked_by: "anyone",
    needs_recipe: true,
    tags: ["quick", "kid-friendly"],
    ingredients: [
      { name: "store-bought gnocchi", qty: null, unit: null, category: PA },
    ],
    notes:
      "Confirm: store-bought gnocchi + leftover bolognaise, no separate recipe (§10).",
  },
  {
    name: "Shepherd's Pie",
    cuisine: "British",
    cooked_by: "peter",
    is_favourite: true,
    needs_recipe: true,
    tags: ["weekend-cook", "kid-friendly"],
    notes: "Source still needed (AllRecipes was blocked) (§10).",
  },
  {
    name: "Coq au Vin",
    cuisine: "French",
    cooked_by: "peter",
    is_favourite: true,
    needs_recipe: true,
    tags: ["weekend-cook"],
    notes: "Queued for next planning cycle (§10).",
  },
];

// ---------------------------------------------------------------------------
// Favourites list — names only (handoff §8). Seeded as lightweight favourite
// entries so the AI can suggest them; details owed => needs_recipe = true.
// Names already covered by a full recipe above are omitted to avoid dupes.
// ---------------------------------------------------------------------------
const FAVOURITE_NAMES: { name: string; cuisine: string }[] = [
  { name: "Burritos", cuisine: "Mexican" },
  { name: "Fajitas", cuisine: "Mexican" },
  { name: "Enchiladas", cuisine: "Mexican" },
  { name: "Quesadillas", cuisine: "Mexican" },
  { name: "Meatballs & Spaghetti", cuisine: "Italian" },
  { name: "Chicken Spaghetti", cuisine: "Italian" },
  { name: "Carbonara", cuisine: "Italian" },
  { name: "Gnocchi with Tomato Sauce", cuisine: "Italian" },
  { name: "Risotto", cuisine: "Italian" },
  { name: "Minestrone", cuisine: "Italian" },
  { name: "BBQ Butterfly Chicken", cuisine: "Chicken" },
  { name: "Huli Huli Chicken", cuisine: "Hawaiian" },
  { name: "Turkish Kebab", cuisine: "Turkish" },
  { name: "Katsu Don", cuisine: "Japanese" },
  { name: "Chicken Burgers", cuisine: "Chicken" },
  { name: "Greek Lemon Chicken & Potatoes", cuisine: "Greek" },
  { name: "Hainanese Chicken Rice", cuisine: "Chinese" },
  { name: "Yakitori", cuisine: "Japanese" },
  { name: "Chicken Pot Pie", cuisine: "Chicken" },
  { name: "Korean Fried Chicken", cuisine: "Korean" },
  { name: "Teriyaki Chicken & Rice", cuisine: "Japanese" },
  { name: "Chicken Souvlaki", cuisine: "Greek" },
  { name: "Chicken Noodle Soup", cuisine: "Soup" },
  { name: "Smash Burgers", cuisine: "American" },
  { name: "Rump Steak", cuisine: "Beef" },
  { name: "Swedish Meatballs", cuisine: "Swedish" },
  { name: "Moussaka", cuisine: "Greek" },
  { name: "Beef Bourguignon", cuisine: "French" },
  { name: "Beef Rendang", cuisine: "Malaysian" },
  { name: "Japanese Beef Curry", cuisine: "Japanese" },
  { name: "Yakiniku", cuisine: "Japanese" },
  { name: "Irish Beef Stew", cuisine: "Irish" },
  { name: "Tomato Soup", cuisine: "Soup" },
  { name: "Chicken Soup", cuisine: "Soup" },
  { name: "French Onion Soup", cuisine: "Soup" },
  { name: "Tabbouleh", cuisine: "Middle Eastern" },
  { name: "Falafel & Hummus Bowl", cuisine: "Middle Eastern" },
  { name: "Shakshuka", cuisine: "Middle Eastern" },
  { name: "Persian Lamb & Herb Rice", cuisine: "Persian" },
  { name: "Baked Potatoes", cuisine: "Flexible" },
  { name: "Breakfast for Dinner", cuisine: "Flexible" },
];

export const SEED_FAVOURITE_NAMES = FAVOURITE_NAMES;

// ---------------------------------------------------------------------------
// Pantry baseline (handoff §3 staples + §6 pantry check). is_staple => skip quiz
// ---------------------------------------------------------------------------
export const SEED_PANTRY: {
  name: string;
  category: Category;
  status: "in-stock" | "low" | "out";
  is_staple: boolean;
  is_food: boolean;
}[] = [
  { name: "Lemons (tree)", category: P, status: "in-stock", is_staple: true, is_food: true },
  { name: "Fresh rosemary", category: P, status: "in-stock", is_staple: true, is_food: true },
  { name: "Fresh thyme", category: P, status: "in-stock", is_staple: true, is_food: true },
  { name: "Rice", category: PA, status: "in-stock", is_staple: false, is_food: true },
  { name: "Garlic", category: P, status: "in-stock", is_staple: false, is_food: true },
  { name: "Onions", category: P, status: "in-stock", is_staple: false, is_food: true },
];
