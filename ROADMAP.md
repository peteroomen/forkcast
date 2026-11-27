# Forkcast roadmap

What's next, roughly in priority order. Notes come from using it for real.

## 1. Ingredient normalising and NZ names

Lists are only as good as the ingredient names behind them. Today there's a small
regex map (US → NZ names, a few common misspellings) applied on import and when the
list is built. That isn't enough: it misses things ("pepper" meaning capsicum,
"scallion" in odd forms), can't merge near-duplicates, and fixes nothing at the
source.

- **Canonical ingredient dictionary**: one row per real-world thing (NZ display
  name, aliases, supermarket section, typical shelf life, the unit it's bought in).
  Every meal ingredient links to an entry; the list groups by entry, not by text.
- **Fix at the source**: normalise on import, on paste and on save, not only when
  building the list. Clean up existing meals once (typos like "Corriander" or
  "Tumeric", sections like coriander filed under Pantry).
- **Context-aware swaps**: "pepper" is black pepper next to salt but capsicum in
  "1 red pepper, diced". Same for "cream", "stock", "chilli".
- **Smarter merging**: "chicken" / "chicken breast" / "bone-in chicken" stay
  separate, but "garlic" / "garlic cloves" / "minced garlic" merge.
- **Buyable quantities**: "1.13kg beef mince" → "2 × 500g packs + 1 × 150g"? At
  least round to what's on the shelf (tins, packs, bunches). Hide quantities that
  don't help ("3¾ tbsp soy sauce" → just "Soy sauce").
- **"Rename everywhere"** from the list or library, which updates aliases.

## 2. Speed

**Done (first pass):** measured from the US against production, warm page loads
went from ~1.15s to ~0.43s and cold ones from ~3.4s to ~1.4s.
- Middleware no longer calls Supabase Auth on every request (`getSession` from
  the cookie; RLS still verifies the token on every query).
- Pages read the user from the token, and household + members load in one query.
- Visited tabs stay in the client router cache for 30s, so switching back is
  instant (~60ms); saving anything clears it.
- A skeleton appears the moment you tap a tab.

**Next:**
- Cold starts: check Vercel Fluid compute is on for the project; consider a
  light keep-warm ping during the day.
- Optimistic updates everywhere a tap waits on the server (library edits,
  settings), and keep the meal library client-side between pages.
- Fold each screen's queries into one RPC or view (the plan page makes six).
- Real numbers from phones: Vercel Speed Insights.

## 3. Inline editing and tidier navigation

- **Edit ingredients where you are**: adding ingredients from the plan currently
  jumps to the meal editor and back is confusing. Open a sheet over the plan (or
  list) instead, save, and stay put.
- **Quick-edit sheet** for the common meal tweaks (how often, who cooks, effort,
  prep note) without the full form.
- **Back goes back**: return to wherever you came from (plan, list, library), not
  always the library.
- **Fewer nested pages**: pantry as a sheet off the list; settings sections
  collapsible.
- Swap a meal or add a forgotten item straight from the shopping list.

## 4. Ready-made meals

A Costco meal or frozen pizza night is currently a "recipe" with one ingredient,
which is awkward.

- A **Ready-made** meal kind: a product to buy (and where: Costco, the supermarket,
  the butcher), how many, and how long it keeps. No method, no ingredients form.
- **Lists per shop**: Costco items on their own list (or tab), so the supermarket
  list stays clean. This generalises: any item can have a preferred shop.
- The planner treats ready-made meals as the quickest option for busy nights, and
  can suggest "keep one in the freezer" as a fallback night.

## 5. Voice and Google Keep

The family already uses Google Keep for shopping, and "Hey Google, add milk to the
shopping list" is the natural way to add things. Two routes, to research before
building (the Google side changes often, so check what's current):

- **Keep sync**: Google Assistant / Gemini put "add to my shopping list" items
  into Keep (when Keep is set as the shopping list provider), so syncing Forkcast
  with a Keep list gets voice for free. The catch: Google's official Keep API is
  only for Google Workspace accounts, not personal Gmail ones. Unofficial libraries
  exist but log in as you and break when Google changes things. Worth checking
  for anything newer.
- **Our own voice app**: Google shut down Conversational Actions (third-party
  "Talk to Forkcast" apps) in 2023, so a classic Google Home app may not be
  possible any more. Options to check: Gemini extensions or other ways to add
  your own actions, Android app shortcuts / App Actions if Forkcast became a
  native or TWA app, or a Home Assistant bridge if you run one.
- **Either way, Forkcast-side**: an "inbox" for items arriving from outside
  (Keep, voice, share sheet) that land on the Extras list, auto-sorted into
  sections, and voice-friendly commands like "we had tacos tonight" or "Megan's
  cooking Thursday".

Pick based on what's actually possible today: Keep sync if there's a reliable
path, otherwise the share sheet + PWA shortcut as a quick win.

## Also queued

- **Tonight screen**: what's on, who's cooking, prep steps, and the recipe in
  cooking mode (big text, screen kept awake).
- **Planning nudges for Megan and Jamie**: "Want a night this fortnight?" when a
  plan starts; Jamie gets her own login.
- **Aisle order for your supermarket**: drag sections into the order you walk them.
- **New meal ideas**: one "try something new" slot per plan, from what the family
  likes, with RecipeTin Eats search.
- **Stats**: most-loved meals, neglected favourites, who's cooked what.
- **Data tidy-ups**: Pad See Ew (Beef) uses RecipeTin's chicken version; "Kid 2" /
  "Kid 3" placeholders in Settings.
