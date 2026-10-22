// OnMart without a live stock (marketplace/partsCatalogue.ts, constants/partsTaxonomy.ts): a shop says what it sells and for which
// vehicles, searches are matched against that, requests go to the closest fits and replies can point to a neighbour.
const test = require('node:test');
const assert = require('node:assert/strict');
const load = require('./load.cjs');

const cat = load('marketplace/partsCatalogue');
const tax = load('constants/partsTaxonomy');
const categories = load('constants/categories');

const entry = (id, groupId, vehicles, extra = {}) => ({ id, groupId, vehicles, brands: [], partTypes: ['Genuine', 'OEM', 'Recon'], addedAt: 0, ...extra });
// Shop A sells headlights for Honda, Toyota and Mazda; Shop B for Benz, BMW and Nissan (the example that started this).
const shopA = { id: 'A', distanceKm: 3, catalogue: [entry('a1', 'lighting', ['Honda', 'Toyota', 'Mazda'].map((make) => ({ make })), { partId: 'headlight' })] };
const shopB = { id: 'B', distanceKm: 1, catalogue: [entry('b1', 'lighting', ['Mercedes-Benz', 'BMW', 'Nissan'].map((make) => ({ make })), { partId: 'headlight' })] };

test('the taxonomy is consistent: unique ids, every part in a group, every group in a real service category', () => {
  const ids = tax.PART_TAXONOMY.map((p) => p.id);
  assert.equal(new Set(ids).size, ids.length);
  const groups = new Set(tax.PART_TAXONOMY_GROUPS.map((g) => g.id));
  assert.equal(groups.size, tax.PART_TAXONOMY_GROUPS.length);
  for (const p of tax.PART_TAXONOMY) assert.ok(groups.has(p.groupId), p.id);
  for (const g of tax.PART_TAXONOMY_GROUPS) assert.ok(categories.SERVICE_CATEGORIES.some((c) => c.id === g.serviceCategoryId), g.id);
  assert.ok(tax.PART_TAXONOMY.length >= 60);
  assert.ok(cat.partInfo('headlight').variants.includes('LED'));
});

test('what a buyer types finds the part (English, Singlish and Sinhala)', () => {
  assert.equal(cat.findParts('headlight')[0].id, 'headlight');
  assert.equal(cat.findParts('head lamp')[0].id, 'headlight');
  assert.equal(cat.findParts('හෙඩ්ලයිට්')[0].id, 'headlight');
  assert.equal(cat.findParts('brake pads')[0].id, 'brake-pads');
  assert.deepEqual(cat.findParts('zzzz'), []);
});

test('makes have aliases and a chassis number gives its model code', () => {
  assert.equal(cat.normaliseMake('benz'), 'Mercedes-Benz');
  assert.equal(cat.normaliseMake('Merc'), 'Mercedes-Benz');
  assert.equal(cat.normaliseMake('toyota'), 'Toyota');
  assert.equal(cat.normaliseMake('some new make'), 'Some New Make');
  assert.equal(cat.modelCodeFromChassis('NZE141-9012345'), 'NZE141');
  assert.equal(cat.modelCodeFromChassis('GP5 1234567'), 'GP5');
  assert.equal(cat.modelCodeFromChassis(''), undefined);
});

test('a Benz headlight search brings shop B, a Toyota one brings shop A', () => {
  const benz = cat.matchingShops([shopA, shopB], { partId: 'headlight', vehicle: { make: 'benz' } });
  assert.deepEqual(benz.map((m) => m.shop.id), ['B']);
  const toyota = cat.matchingShops([shopA, shopB], { partId: 'headlight', vehicle: { make: 'Toyota' } });
  assert.deepEqual(toyota.map((m) => m.shop.id), ['A']);
  assert.equal(cat.matchingShops([shopA, shopB], { partId: 'headlight', vehicle: { make: 'Suzuki' } }).length, 0);
  // a different part is not sold by either
  assert.equal(cat.matchingShops([shopA, shopB], { partId: 'brake-pads', vehicle: { make: 'Toyota' } }).length, 0);
});

test('the closer the tag fits the vehicle, the higher the shop ranks: code, then model, then make, then any vehicle', () => {
  const exact = { id: 'e', distanceKm: 9, catalogue: [entry('e', 'lighting', [{ make: 'Toyota', models: ['Premio'], codes: ['NZT240'] }], { partId: 'headlight' })] };
  const model = { id: 'm', distanceKm: 5, catalogue: [entry('m', 'lighting', [{ make: 'Toyota', models: ['Premio'] }], { partId: 'headlight' })] };
  const make = { id: 'k', distanceKm: 2, catalogue: [entry('k', 'lighting', [{ make: 'Toyota' }], { partId: 'headlight' })] };
  const any = { id: 'a', distanceKm: 1, catalogue: [entry('a', 'lighting', [], { partId: 'headlight' })] };
  const q = { partId: 'headlight', vehicle: { make: 'Toyota', model: 'Premio', code: 'NZT240' } };
  assert.deepEqual(cat.matchingShops([any, make, model, exact], q).map((m) => [m.shop.id, m.match.tier]), [['e', 'exact'], ['m', 'model'], ['k', 'make'], ['a', 'any']]);
  // a tag narrowed to other models does not cover this vehicle
  const other = { id: 'o', catalogue: [entry('o', 'lighting', [{ make: 'Toyota', models: ['Aqua'] }], { partId: 'headlight' })] };
  assert.equal(cat.shopCovers(other.catalogue, q), null);
  // a model tag whose codes exclude this vehicle's code is not a match either
  const wrongCode = { id: 'w', catalogue: [entry('w', 'lighting', [{ make: 'Toyota', models: ['Premio'], codes: ['ZRT260'] }], { partId: 'headlight' })] };
  assert.equal(cat.shopCovers(wrongCode.catalogue, q), null);
});

test('a whole-group entry covers every part of the group; a part entry beats it', () => {
  const group = [entry('g', 'brakes', [{ make: 'Honda' }])];
  assert.equal(cat.shopCovers(group, { partId: 'brake-pads', vehicle: { make: 'Honda' } }).scope, 'group');
  assert.equal(cat.shopCovers(group, { partId: 'headlight', vehicle: { make: 'Honda' } }), null);
  const both = [...group, entry('p', 'brakes', [{ make: 'Honda' }], { partId: 'brake-pads' })];
  assert.equal(cat.shopCovers(both, { partId: 'brake-pads', vehicle: { make: 'Honda' } }).scope, 'part');
});

test('part types: a shop that deals only in Recon is not asked for a Genuine part', () => {
  const recon = [entry('r', 'lighting', [], { partId: 'headlight', partTypes: ['Recon'] })];
  assert.equal(cat.shopCovers(recon, { partId: 'headlight', partType: 'Genuine' }), null);
  assert.ok(cat.shopCovers(recon, { partId: 'headlight', partType: 'Recon' }));
  assert.ok(cat.shopCovers(recon, { partId: 'headlight', partType: 'GarageChoice' }));
});

test('a request goes to the closest few shops; asking again goes to the next ones', () => {
  const shops = Array.from({ length: 8 }, (_, i) => ({ id: `s${i}`, distanceKm: i + 1, catalogue: [entry(`e${i}`, 'lighting', [{ make: 'Toyota' }], { partId: 'headlight' })] }));
  const matches = cat.matchingShops(shops, { partId: 'headlight', vehicle: { make: 'Toyota' } });
  const first = cat.broadcastTargets(matches);
  assert.equal(first.length, cat.BROADCAST_LIMIT);
  assert.deepEqual(first.map((m) => m.shop.id), ['s0', 's1', 's2', 's3', 's4']);
  const next = cat.broadcastTargets(matches, new Set(first.map((m) => m.shop)));
  assert.deepEqual(next.map((m) => m.shop.id), ['s5', 's6', 's7']);
});

test('a shop without the part can point to neighbours that sell it, never itself or one already asked', () => {
  const shops = [1, 2, 3, 4].map((n) => ({ id: `n${n}`, distanceKm: n, catalogue: [entry(`e${n}`, 'lighting', [{ make: 'Honda' }], { partId: 'headlight' })] }));
  const out = cat.suggestNeighbours(shops, { partId: 'headlight', vehicle: { make: 'Honda' } }, ['n1', 'n2'], 3);
  assert.deepEqual(out.map((s) => s.id), ['n3', 'n4']);
});

test('only "have it" can lead to a reservation', () => {
  assert.ok(cat.replyCanReserve('have'));
  assert.ok(!cat.replyCanReserve('none'));
  assert.ok(!cat.replyCanReserve('check'));
});

test('a catalogue must sell something, and not tag everything at once', () => {
  assert.ok(cat.validateCatalogue([]).length > 0);
  assert.deepEqual(cat.validateCatalogue([entry('a', 'brakes', [{ make: 'Toyota' }])]), []);
  const many = Array.from({ length: cat.MAX_MAKES_PER_ENTRY + 1 }, (_, i) => ({ make: `M${i}` }));
  assert.ok(cat.validateCatalogue([entry('a', 'brakes', many)]).length > 0);
  assert.ok(cat.validateCatalogue([entry('a', 'brakes', []), entry('b', 'brakes', [])]).length > 0);
  assert.ok(cat.validateCatalogue([entry('a', 'nonsense', [])]).length > 0);
});

test('entries can be added, replaced and removed, and read back as one line', () => {
  let c = [];
  c = cat.upsertEntry(c, entry('x', 'lighting', [{ make: 'Honda' }, { make: 'Toyota' }], { partId: 'headlight' }));
  c = cat.upsertEntry(c, entry('x2', 'lighting', [{ make: 'Mazda' }], { partId: 'headlight' }));
  assert.equal(c.length, 1);
  assert.equal(cat.entryLabel(c[0]), 'Headlights — Mazda');
  c = cat.upsertEntry(c, entry('y', 'brakes', [{ make: 'Toyota', models: ['Axio', 'Allion'] }]));
  assert.match(cat.entryLabel(c[1]), /Toyota Axio\/Allion/);
  assert.equal(cat.removeEntry(c, 'y').length, 1);
  assert.deepEqual(cat.cataloguesMakes(c), ['Mazda', 'Toyota']);
});

test('templates give a valid starting catalogue, and read back as the older types and categories', () => {
  for (const t of cat.SHOP_TEMPLATES) assert.deepEqual(cat.validateCatalogue(t.build()), [], t.id);
  const c = cat.catalogueFromTemplates(['japanese', 'tyres-batteries']);
  assert.ok(c.some((e) => e.groupId === 'tyres'));
  assert.ok(cat.catalogueTypes(c).includes('Genuine'));
  const cats = cat.catalogueCategories(c);
  assert.ok(cats.includes('7') && cats.includes('6') && cats.includes('11'));
  // merging two templates that share a group keeps one entry for it
  const dup = cat.catalogueFromTemplates(['japanese', 'auto-electrical']);
  assert.equal(dup.filter((e) => e.groupId === 'electrical').length, 1);
});

// ---------- Step 2: the rules in partsMart.ts ----------
const mart = load('marketplace/partsMart');
const stats = (extra = {}) => ({ rating: 4.5, reviews: 10, ordersDone: 40, fulfilmentRate: 0.9, stockAccuracy: 0.5, wrongPartRate: 0.05, cancelRate: 0.05, avgResponseMin: 10, priceLevel: 1, ...extra });
const mk = (id, km, make, extra = {}) => ({ id, distanceKm: km, types: ['Genuine'], categories: [], stats: stats(), catalogue: make ? [entry(id, 'lighting', [{ make }], { partId: 'headlight' })] : undefined, ...extra });
const brief = { name: 'headlight', partType: 'Genuine', vehicle: { make: 'Toyota' } };

test('the service score uses the buyer-confirmed answer accuracy when there is one', () => {
  const old = mart.shopServiceScore(stats());
  const better = mart.shopServiceScore(stats({ answerAccuracy: 1 }));
  assert.ok(better > old);
  assert.equal(mart.accuracyOf(stats()), 0.5);
});

test('a buyer saying the part was not there lowers the answer accuracy', () => {
  const s = mart.recordAnswerFeedback(stats({ answerAccuracy: 1, answersDone: 9 }), false);
  assert.equal(s.answerAccuracy, 0.9);
  assert.equal(s.answersDone, 10);
});

test('a request goes to catalogue shops that cover it, widening the ring when the near one has none', () => {
  const near = mk('near', 2, 'Honda');
  const far = mk('far', 30, 'Toyota');
  const r = mart.requestReach([near, far], brief, 'nearby');
  assert.deepEqual(r.targets.map((t) => t.shop.id), ['far']);
  assert.ok(!r.fallback);
  assert.equal(mart.requestReach([near, far], { ...brief, vehicle: { make: 'Suzuki' } }).targets.length, 0);
});

test('shops without a catalogue are asked the older way only when no catalogue shop covers it', () => {
  const old = mk('old', 3, undefined, { categories: [] });
  const r = mart.requestReach([old], brief, 'nearby');
  assert.ok(r.fallback);
  assert.deepEqual(r.targets.map((t) => t.shop.id), ['old']);
});

test('replies: older offers read as have / none; only have can be reserved', () => {
  assert.equal(mart.offerReply({ available: true }), 'have');
  assert.equal(mart.offerReply({ available: false }), 'none');
  assert.equal(mart.offerReply({ available: false, reply: 'check' }), 'check');
  assert.ok(!mart.offerCanReserve({ available: false, reply: 'check' }));
  assert.ok(!mart.offerHasPrice({ unitPrice: 0 }));
});

test('neighbour suggestions are filtered to shops that really cover it', () => {
  const shops = [mk('x', 1, 'Toyota'), mk('y', 2, 'Honda'), mk('z', 3, 'Toyota')];
  assert.deepEqual(mart.validSuggestions(shops, brief, ['x', 'y', 'z'], ['x']), ['z']);
});

test('the answer window closes after 30 minutes', () => {
  assert.ok(!mart.answerOverdue(0, 29 * 60000));
  assert.ok(mart.answerOverdue(0, 31 * 60000));
});

test('the wall shows a catalogue shop only the posts for what it sells', () => {
  assert.ok(mart.wallVisibleTo(mk('a', 1, 'Toyota'), brief));
  assert.ok(!mart.wallVisibleTo(mk('b', 1, 'Honda'), brief));
});

test('a catalogue shop answers the same way every time; stock means a priced "have it"', () => {
  const a = mart.planReply('ps5', 'Headlight', false);
  assert.deepEqual(a, mart.planReply('ps5', 'Headlight', false));
  assert.deepEqual(mart.planReply('ps5', 'Headlight', true), { kind: 'have', priced: true });
  const kinds = new Set(Array.from({ length: 40 }, (_, i) => mart.planReply(`s${i}`, 'Brake pads', false).kind));
  assert.deepEqual([...kinds].sort(), ['check', 'have', 'none']);
  for (let i = 0; i < 40; i++) {
    const p = mart.planReply(`s${i}`, 'Brake pads', false);
    if (p.kind === 'check') assert.ok(p.settles);
  }
});

test('the match sort puts the closest catalogue fit first and a shop that does not cover it last', () => {
  const model = mk('m', 9, 'Toyota');
  model.catalogue = [entry('m', 'lighting', [{ make: 'Toyota', models: ['Premio'] }], { partId: 'headlight' })];
  const make = mk('k', 1, 'Toyota');
  const none = mk('n', 0.5, 'Honda');
  const q = { partId: 'headlight', vehicle: { make: 'Toyota', model: 'Premio' } };
  assert.deepEqual(mart.rankShops([none, make, model], 'match', { query: q }).map((s) => s.id), ['m', 'k', 'n']);
});

test('the chat line for a shop answer: price or counter price, checking, none with neighbours', () => {
  assert.match(mart.replyMessage({ available: true, unitPrice: 5000, total: 10000 }), /5,000/);
  assert.match(mart.replyMessage({ available: true, reply: 'have', unitPrice: 0, total: 0 }), /කවුන්ටරයේදී/);
  assert.match(mart.replyMessage({ available: false, reply: 'check', unitPrice: 0, total: 0 }), /පරීක්ෂා/);
  assert.match(mart.replyMessage({ available: false, unitPrice: 0, total: 0 }, ['Kandy Parts Centre']), /Kandy Parts Centre/);
  assert.doesNotMatch(mart.replyMessage({ available: false, unitPrice: 0, total: 0 }), /තිබිය හැක/);
});

// ---------- Step 7: the demo directory moved from live stock to catalogues ----------
test('every directory shop except the parts app\'s own has a valid catalogue that answers a Toyota brake pad search', () => {
  const shops = load('constants/martShops');
  for (const s of shops.MART_SHOPS) {
    if (s.id === 'ps1') {
      assert.equal(s.catalogue, undefined);
      continue;
    }
    assert.deepEqual(cat.validateCatalogue(s.catalogue), [], s.id);
    assert.ok(cat.shopCovers(s.catalogue, { partId: 'brake-pads', vehicle: { make: 'Toyota' } }), s.id);
  }
  // the neighbour pool a "don't have it" reply draws from is never empty for a common part
  assert.ok(cat.suggestNeighbours(shops.MART_SHOPS, { partId: 'brake-pads', vehicle: { make: 'Toyota' } }, ['ps1'], 3).length === 3);
});

test('a live-stock price list still ranks and scores as before for a shop with no catalogue', () => {
  const old = mk('o', 3, undefined);
  assert.equal(mart.accuracyOf(old.stats), old.stats.stockAccuracy);
  assert.deepEqual(mart.rankShops([mk('far', 9, undefined), old], 'distance').map((s) => s.id), ['o', 'far']);
});
