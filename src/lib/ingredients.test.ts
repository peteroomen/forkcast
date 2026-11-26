import { test } from "node:test";
import assert from "node:assert/strict";
import { parseIngredient, formatIngredient, scaleQuantity } from "./ingredients";
import { guessSection } from "./sections";

const cases: [string, ReturnType<typeof parseIngredient>][] = [
  ["500 g beef mince", { quantity: 500, unit: "g", name: "beef mince", note: null }],
  ["500g / 1 lb beef mince (ground beef)", { quantity: 500, unit: "g", name: "beef mince", note: "ground beef" }],
  ["2 tbsp olive oil , separated", { quantity: 2, unit: "tbsp", name: "olive oil", note: "separated" }],
  ["1 ½ cups (375ml) chicken stock", { quantity: 1.5, unit: "cup", name: "chicken stock", note: null }],
  ["2-3 garlic cloves, minced", { quantity: 3, unit: null, name: "garlic cloves", note: "minced" }],
  ["3 cloves garlic", { quantity: 3, unit: "clove", name: "garlic", note: null }],
  ["1 large onion, diced", { quantity: 1, unit: "large", name: "onion", note: "diced" }],
  ["1 red bell pepper", { quantity: 1, unit: null, name: "red capsicum", note: null }],
  ["1/2 cup cilantro leaves", { quantity: 0.5, unit: "cup", name: "coriander leaves", note: null }],
  ["Salt and black pepper", { quantity: null, unit: null, name: "Salt and black pepper", note: null }],
  ["400g can crushed tomatoes", { quantity: 400, unit: "g", name: "can crushed tomatoes", note: null }],
  ["1 tin chickpeas, drained", { quantity: 1, unit: "tin", name: "chickpeas", note: "drained" }],
];

for (const [input, expected] of cases) {
  test(`parse: ${input}`, () => assert.deepEqual(parseIngredient(input), expected));
}

test("format round trip", () => {
  assert.equal(formatIngredient({ quantity: 500, unit: "g", name: "beef mince", note: null }), "500g beef mince");
  assert.equal(formatIngredient({ quantity: 1.5, unit: "cup", name: "rice", note: null }), "1½ cups rice");
  assert.equal(formatIngredient({ quantity: 2, unit: "clove", name: "garlic", note: "crushed" }), "2 cloves garlic, crushed");
  assert.equal(formatIngredient({ quantity: null, unit: null, name: "parsley", note: "to garnish" }), "parsley, to garnish");
  const p = parseIngredient("1½ cups rice");
  assert.equal(formatIngredient(p), "1½ cups rice");
});

test("scale 4 → 5", () => {
  assert.equal(scaleQuantity(400, 4, 5), 500);
  assert.equal(scaleQuantity(null, 4, 5), null);
});

test("sections", () => {
  assert.equal(guessSection("beef mince"), "meat_seafood");
  assert.equal(guessSection("chicken stock"), "pantry");
  assert.equal(guessSection("soy sauce"), "international");
  assert.equal(guessSection("red capsicum"), "produce");
  assert.equal(guessSection("frozen peas"), "frozen");
  assert.equal(guessSection("sour cream"), "dairy_eggs");
  assert.equal(guessSection("pita bread"), "bakery");
  assert.equal(guessSection("garlic powder"), "pantry");
  assert.equal(guessSection("spaghetti"), "pantry");
});

const recipeTin: [string, ReturnType<typeof parseIngredient>][] = [
  ["1 onion (, finely chopped (brown, yellow or white))", { quantity: 1, unit: null, name: "onion", note: "finely chopped (brown, yellow or white)" }],
  ["1 lb / 500g beef mince (ground beef) (OR half pork, half beef (Note 1))", { quantity: 500, unit: "g", name: "beef mince", note: "ground beef; OR half pork, half beef" }],
  ["1/2 cup (125 ml) dry red wine ((sub water or beef broth/stock))", { quantity: 0.5, unit: "cup", name: "dry red wine", note: "sub water or beef broth/stock" }],
  ["4 chicken drumsticks ((Note 1))", { quantity: 4, unit: null, name: "chicken drumsticks", note: null }],
  ["4 chicken thighs, bone-in, skin on ((~250g/8oz each) (Note 1))", { quantity: 4, unit: null, name: "chicken thighs", note: "bone-in, skin on; ~250g/8oz each" }],
  ["400 g / 13 oz spaghetti (, dried)", { quantity: 400, unit: "g", name: "spaghetti", note: "dried" }],
  ["1 lb chicken breast", { quantity: 454, unit: "g", name: "chicken breast", note: null }],
];
for (const [input, expected] of recipeTin) {
  test(`parse (RecipeTin): ${input}`, () => assert.deepEqual(parseIngredient(input), expected));
}

test("scale countables to whole numbers", () => {
  assert.equal(scaleQuantity(1, 4, 5, "large"), 1);
  assert.equal(scaleQuantity(2, 4, 5, "clove"), 3);
  assert.equal(scaleQuantity(2, 4, 5, null), 3);
  assert.equal(scaleQuantity(2, 4, 5, "tbsp"), 2.5);
  assert.equal(scaleQuantity(0.5, 4, 5, null), 0.625);
});
test("kg stays decimal", () => assert.equal(formatIngredient({ quantity: 1.2, unit: "kg", name: "potatoes", note: null }), "1.2kg potatoes"));
test("scaled amounts read like a person wrote them", () => {
  assert.equal(formatIngredient({ quantity: 0.9375, unit: "tsp", name: "salt", note: null }), "1 tsp salt");
  assert.equal(formatIngredient({ quantity: 37.5, unit: "g", name: "butter", note: null }), "40g butter");
  assert.equal(formatIngredient({ quantity: 1 / 3, unit: "cup", name: "brandy", note: null }), "⅓ cup brandy");
  assert.equal(formatIngredient({ quantity: 3.75, unit: "tbsp", name: "flour", note: null }), "3¾ tbsp flour");
});
