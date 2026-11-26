import { test } from "node:test";
import assert from "node:assert/strict";
import { extractRecipe, guessProtein, isoMinutes } from "./recipe-import";

const html = `<html><head><script type="application/ld+json">${JSON.stringify({
  "@context": "https://schema.org",
  "@graph": [
    { "@type": "WebPage", name: "x" },
    {
      "@type": "Recipe",
      name: "Chicken &amp; Leek Pie",
      recipeYield: ["4", "4 people"],
      totalTime: "PT1H15M",
      recipeCuisine: ["British"],
      image: ["https://example.com/a.jpg"],
      recipeIngredient: ["2 tbsp olive oil", "600g / 1.2 lb chicken thighs (Note 1)", "1 cup chicken stock"],
      recipeInstructions: [
        { "@type": "HowToSection", name: "Filling", itemListElement: [{ "@type": "HowToStep", text: "Brown chicken." }] },
        { "@type": "HowToStep", text: "Bake &amp; serve." },
      ],
    },
  ],
})}</script></head></html>`;

test("extracts a schema.org recipe from @graph", () => {
  const r = extractRecipe(html, "https://www.recipetineats.com/pie/")!;
  assert.equal(r.name, "Chicken & Leek Pie");
  assert.equal(r.servings, 4);
  assert.equal(r.total_minutes, 75);
  assert.equal(r.source_name, "RecipeTin Eats");
  assert.equal(r.protein, "chicken");
  assert.equal(r.image_url, "https://example.com/a.jpg");
  assert.deepEqual(r.ingredients.map((i) => i.text), ["2 tbsp olive oil", "600g chicken thighs", "1 cup chicken stock"]);
  assert.match(r.method!, /Filling\n1\. Brown chicken\.\n2\. Bake & serve\./);
});

test("no recipe → null", () => assert.equal(extractRecipe("<html></html>", "https://x.test"), null));
test("iso durations", () => {
  assert.equal(isoMinutes("PT45M"), 45);
  assert.equal(isoMinutes("P0DT2H"), 120);
  assert.equal(isoMinutes("nope"), null);
});
test("protein ignores stock", () => assert.equal(guessProtein("Risotto", ["1 cup chicken stock", "200g mushrooms"]), null));
