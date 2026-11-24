import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('MIZORA has 24 distinct source photos and the supplied USD menu with explicit estimate status', async () => {
  const profile = JSON.parse(await readFile(new URL('../public/mizora.json', import.meta.url)));
  assert.equal(profile.dishes.length, 24);
  assert.equal(new Set(profile.dishes.map(d => d.sourceFile)).size, 24);
  assert.equal(profile.dishes.filter(d => d.menuMatched).length, 24);
  assert.equal(profile.dishes.find(d=>d.id==='mizora-03').price,32);
  assert.equal(profile.dishes.find(d=>d.id==='mizora-12').name,'Beetroot Tartare');
  assert.equal(profile.dishes.find(d=>d.id==='mizora-09').name,'Snow Crab Salad');
  assert.equal(profile.dishes.find(d=>d.id==='mizora-14').price,138);
  for (const dish of profile.dishes) {
    assert.equal(profile.currency, 'USD');
    assert.equal(profile.categories.length, 9);
    assert.equal(profile.menuRevision, 2);
    assert.equal(dish.nutrition.source, 'sample');
    assert.ok(dish.nutrition.kcal > 0);
    assert.equal(dish.allergensVerified, false);
    assert.equal(dish.dietaryVerified, false);
    assert.ok(profile.categories.some(c => c.id === dish.category));
    for (const path of Object.values(dish.media)) {
      assert.ok((await readFile(new URL('../public/' + path, import.meta.url))).length > 1000);
    }
  }
});
