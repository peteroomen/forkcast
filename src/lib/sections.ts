/** Supermarket sections, in rough walk-the-store order for a NZ supermarket. */
export const SECTIONS = [
  { id: "produce", label: "Fruit & veg" },
  { id: "bakery", label: "Bakery" },
  { id: "deli", label: "Deli" },
  { id: "meat_seafood", label: "Meat & seafood" },
  { id: "dairy_eggs", label: "Chilled, dairy & eggs" },
  { id: "pantry", label: "Pantry" },
  { id: "international", label: "International" },
  { id: "frozen", label: "Frozen" },
  { id: "drinks", label: "Drinks" },
  { id: "household", label: "Household" },
  { id: "other", label: "Other" },
] as const;

export type SectionId = (typeof SECTIONS)[number]["id"];

export const SECTION_LABEL: Record<string, string> = Object.fromEntries(
  SECTIONS.map((s) => [s.id, s.label]),
);

// Checked in order; first match wins. Word-ish matches on the lower-cased name.
const RULES: [SectionId, RegExp][] = [
  ["frozen", /\bfrozen\b|\bice cream\b|\bpastry sheets?\b|\bpuff pastry\b|\bfrozen peas\b|\bhash browns?\b/],
  ["international", /\bsoy sauce\b|\bfish sauce\b|\boyster sauce\b|\bhoisin\b|\bmirin\b|\bsake\b|\bsriracha\b|\bgochujang\b|\bcurry paste\b|\bcoconut (milk|cream)\b|\brice noodles?\b|\budon\b|\bramen\b|\bnori\b|\bsesame oil\b|\btortillas?\b|\btaco\b|\bchipotle\b|\bsalsa\b|\btahini\b|\bkecap\b|\bpanko\b|\brice vinegar\b|\bsambal\b|\bmiso\b|\bshaoxing\b/],
  // Shelf-stable forms of fresh things ("chicken stock", "garlic powder", "tomato paste").
  ["pantry", /\bstock\b|\bbroth\b|\bpowder\b|\bpaste\b|\btinned\b|\bcanned\b|\btins?\b|\bdried\b|\bspices?\b|\bseasoning\b|\bgravy\b|\bsauce\b|\bflour\b|\bsugar\b|\boil\b|\bvinegar\b|\bpackets?\b|\bkit\b|\bjar\b|\bcorn chips\b|\bcrackers\b|\bbouillon\b|\bcubes?\b|\bcans?\b|\bcrushed tomato|\bpassata\b|\bbrandy\b/],
  ["meat_seafood", /\bbeef\b|\bmince\b|\bsteak\b|\bchicken\b|\bpork\b|\blamb\b|\bbacon\b|\bsausages?\b|\bchorizo\b|\bham\b|\bsalmon\b|\bfish\b|\bprawns?\b|\bshrimp\b|\bmussels?\b|\btuna steak\b|\bdrumsticks?\b|\bthighs?\b|\bbrisket\b|\bschnitzel\b|\bmeatballs?\b|\bshoulder\b|\bribs?\b|\bduck\b|\bveal\b|\bpancetta\b|\bprosciutto\b|\bsalami\b|\bfillets?\b/],
  ["dairy_eggs", /\bmilk\b|\bcream\b|\bbutter\b|\bcheese\b|\bcheddar\b|\bparmesan\b|\bmozzarella\b|\bfeta\b|\bhalloumi\b|\bricotta\b|\byoghurt\b|\byogurt\b|\beggs?\b|\bsour cream\b|\bcrème fraîche\b|\bcreme fraiche\b|\btzatziki\b|\bhummus\b|\bfresh pasta\b|\bgnocchi\b|\bdips?\b/],
  ["bakery", /\bbread\b|\bbuns?\b|\brolls?\b|\bpita\b|\bnaan\b|\bwraps?\b|\bbaguette\b|\bsourdough\b|\bbrioche\b|\bciabatta\b|\bcrumpets?\b|\bflatbread\b|\bturkish bread\b|\bsliders?\b/],
  ["produce", /\bonions?\b|\bgarlic\b|\bginger\b|\bcarrots?\b|\bpotato(es)?\b|\bkumara\b|\bpumpkin\b|\bcapsicums?\b|\btomato(es)?\b|\blettuce\b|\bspinach\b|\bsilverbeet\b|\bkale\b|\bcabbage\b|\bbroccoli\b|\bcauliflower\b|\bcourgettes?\b|\beggplants?\b|\bcucumbers?\b|\bcelery\b|\bmushrooms?\b|\bavocados?\b|\bavo\b|\blemons?\b|\blimes?\b|\bapples?\b|\bbananas?\b|\bberries\b|\bcoriander\b|\bparsley\b|\bbasil\b|\bmint\b|\bdill\b|\bchives\b|\brosemary\b|\bthyme\b|\bspring onions?\b|\bscallions?\b|\bshallots?\b|\bleeks?\b|\bbeans? sprouts?\b|\bchillies\b|\bchilli\b|\bcorn cobs?\b|\bsweetcorn\b|\bpeas\b|\bbok choy\b|\bpak choy\b|\brocket\b|\bsalad\b|\bherbs\b|\bpineapple\b|\bmango\b|\boranges?\b|\bbeetroot\b|\bparsnips?\b|\bsnow peas\b|\bgreen beans\b|\bfresh\b/],
  ["drinks", /\bjuice\b|\bwine\b|\bbeer\b|\bsoda\b|\bfizzy\b/],
  ["household", /\bfoil\b|\bbaking paper\b|\bglad wrap\b|\bpaper towels?\b|\bdishwash/],
  ["pantry", /.*/],
];

export function guessSection(name: string): SectionId {
  const n = name.toLowerCase();
  for (const [id, re] of RULES) if (re.test(n)) return id;
  return "pantry";
}
