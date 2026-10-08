// OnMart: search reach, wall visibility, shop ranking (never by referral fees), fitment, price tags,
// part names and owner-bought parts in the workshop rule (marketplace/partsMart.ts, workshop.ts).
const test = require('node:test');
const assert = require('node:assert/strict');
const load = require('./load.cjs');

const m = load('marketplace/partsMart');
const w = load('marketplace/workshop');
const code = load('marketplace/closeCode');

const stats = (o = {}) => ({ avgResponseMin: 15, fulfilmentRate: 0.95, stockAccuracy: 0.95, wrongPartRate: 0.02, cancelRate: 0.02, ordersDone: 40, priceLevel: 1, ...o });
const shop = (id, o = {}) => ({
  id, name: id, rating: 4.5, ratingCount: 100, distanceKm: 3, phone: '0', address: 'a', coords: { latitude: 6, longitude: 80 }, district: 'Galle', openHours: '', isOpen: true,
  types: ['Genuine', 'OEM'], categories: ['7', '1'], liveStock: false, courier: true, ownDelivery: false, counterPickup: true, stats: stats(), ...o,
});

test('the search ladder widens from nearby to the whole country', () => {
  assert.equal(m.ringKm('nearby'), 10);
  assert.equal(m.ringKm('wider'), 50);
  assert.equal(m.ringKm('nationwide'), Infinity);
  assert.equal(m.nextRing('nearby'), 'wider');
  assert.equal(m.nextRing('wider'), 'nationwide');
  assert.equal(m.nextRing('nationwide'), null);
  const shops = [shop('a', { distanceKm: 4 }), shop('b', { distanceKm: 30 }), shop('c', { distanceKm: 140 })];
  assert.deepEqual(m.shopsInRing(shops, 'nearby').map((s) => s.id), ['a']);
  assert.deepEqual(m.shopsInRing(shops, 'wider').map((s) => s.id), ['a', 'b']);
  assert.equal(m.shopsInRing(shops, 'nationwide').length, 3);
  assert.equal(m.ringFor(9), 'nearby');
  assert.equal(m.ringFor(11), 'wider');
  assert.equal(m.ringFor(300), 'nationwide');
});

test('audience: shops, wall or both', () => {
  assert.ok(m.reachesShops('shops') && m.reachesShops('both') && !m.reachesShops('wall'));
  assert.ok(m.onWall('wall') && m.onWall('both') && !m.onWall('shops'));
});

test('a wall post only reaches shops that sell that kind of part', () => {
  const genuineBrakes = { partType: 'Genuine', categoryId: '7' };
  assert.ok(m.wallVisibleTo(shop('a'), genuineBrakes));
  assert.ok(!m.wallVisibleTo(shop('b', { types: ['Recon'] }), genuineBrakes));
  assert.ok(!m.wallVisibleTo(shop('c', { categories: ['4'] }), genuineBrakes));
  assert.ok(m.wallVisibleTo(shop('d', { types: ['Recon'] }), { partType: 'GarageChoice', categoryId: '7' }));
  assert.ok(m.wallVisibleTo(shop('e', { categories: ['4'] }), { partType: 'OEM' }));
});

test('ranking: rating, price, response, service and distance', () => {
  const a = shop('a', { rating: 4.9, distanceKm: 8, stats: stats({ avgResponseMin: 30, priceLevel: 1.1 }) });
  const b = shop('b', { rating: 4.2, distanceKm: 2, stats: stats({ avgResponseMin: 5, priceLevel: 0.9, fulfilmentRate: 0.7, stockAccuracy: 0.7 }) });
  const c = shop('c', { rating: 4.6, distanceKm: 5, stats: stats({ avgResponseMin: 12, priceLevel: 1 }) });
  const ids = (sort, o) => m.rankShops([a, b, c], sort, o).map((s) => s.id).join('');
  assert.equal(ids('rating'), 'acb');
  assert.equal(ids('price'), 'bca');
  assert.equal(ids('response'), 'bca');
  assert.equal(ids('distance'), 'bca');
  assert.equal(ids('service'), 'cab', 'a and c score the same, so the nearer one (c) comes first');
  assert.equal(ids('price', { priceOf: (s) => ({ a: 100, b: 300, c: 200 })[s.id] }), 'acb');
  const input = [a, b, c];
  m.rankShops(input, 'rating');
  assert.deepEqual(input.map((s) => s.id), ['a', 'b', 'c'], 'does not reorder its input');
});

test('ranking ignores referral fees', () => {
  const plain = shop('plain', { rating: 4.5 });
  const paying = shop('paying', { rating: 4.5, distanceKm: 6, referralPercent: 5 });
  for (const sort of ['rating', 'price', 'response', 'service', 'distance'])
    assert.deepEqual(m.rankShops([paying, plain], sort).map((s) => s.id), ['plain', 'paying'], sort);
  assert.deepEqual(m.rankShops([plain, { ...paying, distanceKm: 1 }], 'distance').map((s) => s.id), ['paying', 'plain']);
});

test('live stock shops come first in availability searches', () => {
  const near = shop('near', { distanceKm: 1 });
  const live = shop('live', { distanceKm: 5, liveStock: true });
  assert.deepEqual(m.rankShops([near, live], 'distance', { liveStockFirst: true }).map((s) => s.id), ['live', 'near']);
  assert.deepEqual(m.rankShops([near, live], 'distance').map((s) => s.id), ['near', 'live']);
});

test('service score rewards reliable shops; few orders stay near neutral', () => {
  assert.ok(m.shopServiceScore(stats()) > 4.5);
  assert.ok(m.shopServiceScore(stats({ fulfilmentRate: 0.6, stockAccuracy: 0.6, wrongPartRate: 0.2, cancelRate: 0.2 })) < 3.7);
  assert.equal(m.shopServiceScore(stats({ ordersDone: 0 })), 3.5);
  assert.ok(m.shopServiceScore(stats({ ordersDone: 5 })) < m.shopServiceScore(stats({ ordersDone: 40 })));
});

test('claiming a part it does not have costs a shop its stock accuracy', () => {
  const s = stats({ ordersDone: 10, stockAccuracy: 1 });
  const after = m.recordOutcome(s, 'noStock');
  assert.equal(after.ordersDone, 11);
  assert.ok(after.stockAccuracy < 1);
  assert.ok(after.fulfilmentRate < s.fulfilmentRate);
  const good = m.recordOutcome(s, 'fulfilled');
  assert.equal(good.stockAccuracy, 1);
});

test('badges come from the numbers of a shop', () => {
  const badges = m.shopBadges(shop('a', { liveStock: true, stats: stats({ avgResponseMin: 6 }) }));
  assert.ok(badges.length >= 3);
  assert.deepEqual(m.shopBadges(shop('b', { stats: stats({ ordersDone: 2, avgResponseMin: 60, stockAccuracy: 0.5, wrongPartRate: 0.3 }) })), []);
});

test('fitment: confirmed by the shop, likely from the vehicle numbers, else unknown', () => {
  const full = { vehicle: { name: 'Premio', plate: 'CAD-8821', type: 'Sedan', chassisNo: 'JMBF05090D6226789' }, partNo: '04465-20520' };
  assert.equal(m.fitmentLevel(full, true), 'confirmed');
  assert.equal(m.fitmentLevel(full, false), 'likely');
  assert.equal(m.fitmentLevel({ ...full, partNo: undefined }, false), 'unknown');
  assert.equal(m.fitmentLevel({ vehicle: { name: 'x', plate: 'y', type: 'Sedan' }, partNo: '1' }, true), 'unknown');
});

test('price tags compare with the market reference', () => {
  const ref = 9500;
  assert.equal(m.priceTag('Brake pads (front)', 'Genuine', ref), 'fair');
  assert.equal(m.priceTag('Brake pads (front)', 'Genuine', ref * 0.8), 'low');
  assert.equal(m.priceTag('Brake pads (front)', 'Genuine', ref * 1.3), 'high');
  assert.ok(m.PRICE_TAG_LABEL.low && m.PRICE_TAG_LABEL.fair && m.PRICE_TAG_LABEL.high);
});

test('part names: English, Singlish and Sinhala find the canonical name', () => {
  assert.equal(m.canonicalPartName('brake pad eka'), 'Brake pads (front)');
  assert.equal(m.canonicalPartName('Battery'), 'Battery 12V 45Ah');
  assert.equal(m.canonicalPartName('බැටරි එකක්'), 'Battery 12V 45Ah');
  assert.equal(m.canonicalPartName('Alternator'), 'Alternator');
  assert.equal(m.canonicalPartName('radiator'), 'Radiator');
  assert.equal(m.canonicalPartName('headlight'), 'Headlight');
  assert.equal(m.canonicalPartName('xyz'), null);
  assert.equal(m.canonicalPartName('  '), null);
  assert.equal(m.partCategory('Brake disc'), '7');
  assert.equal(m.partCategory('Battery 12V 45Ah'), '11');
  assert.equal(m.partCategory('Nothing'), undefined);
});

test('owner-bought parts: not ordered by the garage, not on its bill, handover waits for the purchase', () => {
  const lines = [
    { id: 'p1', kind: 'part', name: 'Brake disc', qty: 2, partType: 'OEM', source: 'owner', price: 18400, recommendedShopIds: ['ps1'] },
    { id: 'p2', kind: 'part', name: 'Brake pads (front)', qty: 1, partType: 'OEM', source: 'order', price: 6850 },
    { id: 'p3', kind: 'part', name: 'Brake fluid', qty: 1, partType: 'OEM', source: 'stock', price: 1350 },
    { id: 'l1', kind: 'labour', name: 'Fitting', qty: 1, price: 1800 },
  ];
  const progress = { stage: 'repairing', closeCode: '123456', diagnosis: { findings: 'x', lines, revisedTotal: 0, finishBy: 0, sentAt: 0 }, decision: { approvedLineIds: ['p1', 'p2', 'p3', 'l1'], declinedLineIds: [], decidedAt: 1 } };
  assert.deepEqual(w.linesToOrder(progress).map((l) => l.id), ['p2']);
  assert.deepEqual(w.partsStillToOrder(progress, []).map((l) => l.id), ['p2']);
  assert.deepEqual(w.linesOwnerBuys(progress).map((l) => l.id), ['p1']);
  assert.deepEqual(w.ownerPartsPending(progress, []).map((l) => l.id), ['p1']);
  assert.deepEqual(w.ownerPartsPending(progress, ['p1']), []);
  const bill = w.workshopBill(10000, progress);
  assert.equal(bill.labour, 11800);
  assert.equal(bill.parts, 6850 + 1350);
  assert.equal(bill.ownerParts, 18400);
  assert.equal(bill.total, 11800 + 6850 + 1350);
  const declined = { ...progress, decision: { approvedLineIds: ['l1'], declinedLineIds: ['p1', 'p2', 'p3'], decidedAt: 1 } };
  assert.deepEqual(w.ownerPartsPending(declined, []), []);
});

test('the purchase code has its own QR payload', () => {
  assert.equal(code.purchaseCodePayload('482913'), 'ongarage:purchase:482913');
});
