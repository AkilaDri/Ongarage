// The order the service categories are shown in (marketplace/popularity.ts).
const test = require('node:test');
const assert = require('node:assert/strict');
const load = require('./load.cjs');

const p = load('marketplace/popularity');
const cats = load('constants/categories');

test('every category has a place in the default order, and nothing is listed twice', () => {
  const ids = cats.SERVICE_CATEGORIES.map((c) => c.id).sort();
  assert.deepEqual([...p.DEFAULT_POPULARITY].sort(), ids);
  assert.equal(new Set(p.DEFAULT_POPULARITY).size, p.DEFAULT_POPULARITY.length);
});

test('without any use the common services come first', () => {
  const ranked = p.rankCategories(cats.SERVICE_CATEGORIES).map((c) => c.id);
  assert.deepEqual(ranked.slice(0, 5), ['14', '6', '7', '11', '4']);
  assert.equal(ranked.length, cats.SERVICE_CATEGORIES.length);
});

test('what the owner uses most moves to the front; ties keep the default order', () => {
  const ranked = p.rankCategories(cats.SERVICE_CATEGORIES, { '3': 4, '10': 4, '13': 1 }).map((c) => c.id);
  assert.deepEqual(ranked.slice(0, 4), ['3', '10', '13', '14']);
});

test('a category that is not in the default order goes last', () => {
  assert.deepEqual(p.rankCategories([{ id: 'x' }, { id: '14' }]).map((c) => c.id), ['14', 'x']);
});

test('uses are counted per category from anything that carries a category id', () => {
  assert.deepEqual(p.countByCategory([{ categoryId: '7' }, { categoryId: '7' }, { categoryId: '4' }, {}]), { '7': 2, '4': 1 });
});

test('every suggested job is a real sub-service of its category', () => {
  assert.ok(p.POPULAR_SERVICES.length >= 6);
  for (const x of p.POPULAR_SERVICES) {
    const c = cats.SERVICE_CATEGORIES.find((k) => k.id === x.categoryId);
    assert.ok(c, 'category ' + x.categoryId);
    assert.ok(c.subcategories.includes(x.sub), x.sub + ' is not in ' + c.name);
  }
});

test('the suggestions move along the list as time passes, wrap round and repeat for the same moment', () => {
  const pool = ['a', 'b', 'c', 'd', 'e'];
  const ms = p.SUGGESTION_ROTATE_MS;
  assert.deepEqual(p.suggestedNow(pool, 2, 0), ['a', 'b']);
  assert.deepEqual(p.suggestedNow(pool, 2, ms - 1), ['a', 'b']);
  assert.deepEqual(p.suggestedNow(pool, 2, ms), ['c', 'd']);
  assert.deepEqual(p.suggestedNow(pool, 2, 2 * ms), ['e', 'a']);
  assert.deepEqual(p.suggestedNow(pool, 2, 3 * ms), ['b', 'c']);
  assert.deepEqual(p.suggestedNow(pool, 2, 7 * ms), p.suggestedNow(pool, 2, 7 * ms));
  assert.deepEqual(p.suggestedNow([], 3, 0), []);
  assert.deepEqual(p.suggestedNow(pool, 9, 0), pool);
});

test('the suggested jobs are all different, and a full set of eight is always shown', () => {
  const subs = p.POPULAR_SERVICES.map((x) => x.sub);
  assert.equal(new Set(subs).size, subs.length);
  assert.ok(subs.length >= 16);
  for (let t = 0; t < 6; t++) assert.equal(p.suggestedNow(p.POPULAR_SERVICES, 8, t * p.SUGGESTION_ROTATE_MS).length, 8);
});
