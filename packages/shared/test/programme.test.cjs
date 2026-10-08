// The OnMart directory and the referral programme: shop data integrity, stock lookups, who a garage can recommend,
// that ranking never depends on referral fees, and that a shop's and a garage's monthly statements agree
// (constants/martShops.ts, marketplace/partsMart.ts, marketplace/referral.ts).
const test = require('node:test');
const assert = require('node:assert/strict');
const load = require('./load.cjs');

const d = load('constants/martShops');
const m = load('marketplace/partsMart');
const r = load('marketplace/referral');

const GALLE = { latitude: 6.0329, longitude: 80.2168 };

test('the directory: unique shops, the five the garage app simulates, commissions within the cap', () => {
  const ids = d.MART_SHOPS.map((s) => s.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const id of ['ps1', 'ps2', 'ps3', 'ps4', 'ps5']) assert.ok(ids.includes(id), id);
  assert.equal(d.martShop('ps1').name, 'Galle Auto Parts');
  for (const s of d.MART_SHOPS) {
    assert.ok(s.types.length > 0 && s.categories.length > 0, s.id);
    assert.ok((s.referralPercent ?? 0) <= r.COMMISSION_CAP_PERCENT, `${s.id} commission within the cap`);
    assert.ok(s.stats.fulfilmentRate <= 1 && s.stats.stockAccuracy <= 1 && s.stats.priceLevel > 0, s.id);
  }
  for (const [id, lines] of Object.entries(d.MART_STOCK)) {
    assert.ok(ids.includes(id), `stock for a known shop: ${id}`);
    for (const l of lines) assert.ok(l.price > 0 && l.qty >= 0, `${id} ${l.name}`);
  }
});

test('shopsNear measures from the viewer, nearest first', () => {
  const near = d.shopsNear(GALLE);
  assert.equal(near[0].id, 'ps1');
  for (let i = 1; i < near.length; i++) assert.ok(near[i].distanceKm >= near[i - 1].distanceKm);
  assert.ok(near.find((s) => s.id === 'ps8').distanceKm > 100, 'Colombo is far from Galle');
  const fromColombo = d.shopsNear({ latitude: 6.9271, longitude: 79.8612 });
  assert.equal(fromColombo[0].id, 'ps8');
});

test('availability: the cheapest suitable line in stock', () => {
  const disc = d.availabilityAt('ps1', 'Brake disc');
  assert.equal(disc.partType, 'OEM');
  assert.equal(disc.price, 9200);
  // No Genuine battery in stock (qty 0): the OEM one is shown for "any type", nothing for Genuine.
  assert.equal(d.availabilityAt('ps1', 'Battery 12V 45Ah', 'Genuine'), undefined);
  assert.equal(d.availabilityAt('ps1', 'Battery 12V 45Ah').partType, 'OEM');
  assert.equal(d.availabilityAt('ps1', 'Cabin filter').lowStock, true);
  assert.equal(d.availabilityAt('ps1', 'Brake pads (front)').lowStock, false);
  assert.equal(d.availabilityAt('ps1', 'Nothing at all'), undefined);
  assert.equal(d.availabilityAt('nobody', 'Brake disc'), undefined);
  assert.equal(d.shopPriceFor('ps1', 'Brake disc'), 9200);
  assert.ok(d.availabilityAt('ps1', 'Brake pads (front)').price < d.availabilityAt('ps1', 'Brake pads (front)', 'Genuine').price);
});

test('a garage can recommend shops that have the part, nearest first', () => {
  assert.deepEqual(d.suggestShops('Brake disc', 'OEM', GALLE, 3), ['ps1', 'ps3', 'ps2']);
  assert.equal(d.suggestShops('Brake disc', 'OEM', GALLE, 1).length, 1);
  // Genuine discs: only the shop that stocks them comes first, then nearby Genuine sellers without stock.
  const genuine = d.suggestShops('Brake disc', 'Genuine', GALLE, 3);
  assert.equal(genuine[0], 'ps4');
  for (const id of genuine) assert.ok(d.martShop(id).types.includes('Genuine'), id);
  // Nothing beyond 50 km is suggested.
  for (const id of d.suggestShops('Alternator', 'GarageChoice', GALLE, 20)) assert.ok(d.shopsNear(GALLE).find((s) => s.id === id).distanceKm <= 50, id);
});

test('ranking never depends on referral fees, with the real directory', () => {
  const shops = d.shopsNear(GALLE);
  const stripped = shops.map((s) => ({ ...s, referralPercent: undefined }));
  const maxed = shops.map((s) => ({ ...s, referralPercent: r.COMMISSION_CAP_PERCENT }));
  for (const sort of ['rating', 'price', 'response', 'service', 'distance']) {
    const base = m.rankShops(stripped, sort).map((s) => s.id);
    assert.deepEqual(m.rankShops(maxed, sort).map((s) => s.id), base, sort);
    assert.deepEqual(m.rankShops(shops, sort).map((s) => s.id), base, sort);
  }
});

test('the open wall reaches only shops that sell that kind of part', () => {
  const brief = { partType: 'Recon', categoryId: '1' };
  const seen = d.MART_SHOPS.filter((s) => m.wallVisibleTo(s, brief)).map((s) => s.id).sort();
  assert.deepEqual(seen, ['ps10', 'ps2', 'ps3', 'ps5', 'ps9']);
  assert.equal(d.MART_SHOPS.filter((s) => m.wallVisibleTo(s, { partType: 'GarageChoice', categoryId: '4' })).length > 3, true);
});

test('a shop\'s statement and a garage\'s statement tell the same story', () => {
  const T = new Date(2026, 9, 8, 10).getTime();
  const g1 = { id: 'g1', name: 'TOPCODE' };
  const g2 = { id: 'g2', name: 'Southern' };
  const s1 = { id: 'ps1', name: 'Galle Auto Parts' };
  const s3 = { id: 'ps3', name: 'Karapitiya Recon Centre' };
  const sold = (id, garage, shop, amount, closed = true) => {
    let x = r.newReferral({ id, garage, shop, bookingId: id, lineId: 'l', partName: 'p', at: T });
    x = r.advanceReferral(r.advanceReferral(x, 'purchased', T + 1, amount), 'fitted', T + 2);
    return closed ? r.closeReferral(x, T + 3) : x;
  };
  const refs = [sold('a', g1, s1, 10000), sold('b', g1, s3, 5000), sold('c', g2, s1, 20000), sold('d', g2, s1, 4000, false), r.advanceReferral(sold('e', g1, s1, 8000), 'returned', T + 9)];
  const month = r.monthKey(T);
  const shopRows = r.shopStatement(refs, 'ps1', month);
  const total = (rows, k) => rows.reduce((s, x) => s + x[k], 0);
  // Everything the garages sent to ps1, added up from the shop's side, equals the sum of the garages' own rows for ps1.
  const fromGarages = [g1, g2].flatMap((g) => r.garageStatement(refs, g.id, month)).filter((x) => x.shopId === 'ps1');
  for (const k of ['referrals', 'purchases', 'returned', 'partsValue', 'commission']) assert.equal(total(shopRows, k), total(fromGarages, k), k);
  assert.equal(total(shopRows, 'partsValue'), 10000 + 20000 + 4000, 'the returned part is not revenue');
  assert.equal(total(shopRows, 'commission'), 300 + 600, 'commission only where the job closed and the part stayed');
});

test('the statement text names every row and the totals', () => {
  const row = { month: '2026-10', garageId: 'g1', shopId: 'ps1', referrals: 3, purchases: 2, returned: 1, partsValue: 30000, commission: 900 };
  const text = r.statementText('Galle Auto Parts · 2026-10', [{ name: 'TOPCODE', row }, { name: 'Southern', row: { ...row, garageId: 'g2', referrals: 1, purchases: 1, returned: 0, partsValue: 5000, commission: 150 } }]);
  assert.match(text, /^Galle Auto Parts · 2026-10/);
  assert.match(text, /TOPCODE/);
  assert.match(text, /Southern/);
  assert.match(text, /ආපසු 1/);
  assert.match(text, /30,000/);
  assert.match(text, /එකතුව: යොමු 4, මිලදී ගත් 3, කොටස් රු\. 35,000, කොමිස් රු\. 1,050/);
  assert.equal(text.split('\n').length, 4);
});
