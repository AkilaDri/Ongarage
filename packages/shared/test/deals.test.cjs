// OnMart promotions: deal prices and limits, the landing page's banners, offers, deals and shop rows, and that paid
// placements never change the organic rows or the ranking (marketplace/deals.ts, constants/martPromos.ts).
const test = require('node:test');
const assert = require('node:assert/strict');
const load = require('./load.cjs');

const deals = load('marketplace/deals');
const promos = load('constants/martPromos');
const shopsData = load('constants/martShops');
const kits = load('constants/serviceKits');
const mart = load('marketplace/partsMart');

const GALLE = { latitude: 6.0329, longitude: 80.2168 };
const DAY = 24 * 60 * 60 * 1000;
const NOW = new Date(2026, 9, 8, 10).getTime();

test('a deal price: percent off, rounded to 50, never above the original, never free', () => {
  assert.equal(deals.dealPrice(6900, 15), 5850);
  assert.equal(deals.dealPrice(9800, 10), 8800);
  assert.equal(deals.dealPrice(1000, 0), 1000);
  assert.equal(deals.dealPrice(1000, 90), 500, 'capped at the maximum discount');
  assert.equal(deals.dealPrice(60, 50), 50, 'never below the smallest price');
  assert.ok(deals.dealPrice(1300, 12) < 1300);
  assert.equal(deals.dealSaving(6900, 15), 1050);
  assert.equal(deals.dealLabel(15), '−15%');
  assert.equal(deals.dealLabel(99), '−50%');
});

test('what a shop may set on a deal', () => {
  const ok = { discountPercent: 15, endsAt: NOW + 3 * DAY };
  assert.equal(deals.validateDeal(ok, NOW), null);
  assert.ok(deals.validateDeal({ ...ok, discountPercent: 0 }, NOW));
  assert.ok(deals.validateDeal({ ...ok, discountPercent: 60 }, NOW));
  assert.ok(deals.validateDeal({ ...ok, endsAt: NOW - 1 }, NOW), 'must end in the future');
  assert.ok(deals.validateDeal({ ...ok, endsAt: NOW + 15 * DAY }, NOW), 'at most 14 days');
  assert.equal(deals.validateDeal({ ...ok, endsAt: NOW + 14 * DAY }, NOW), null);
});

test('deals end on time; free delivery above a basket value', () => {
  assert.ok(deals.isLive(NOW + 1, NOW));
  assert.ok(!deals.isLive(NOW, NOW));
  assert.ok(deals.isLive(undefined, NOW), 'no end time runs until withdrawn');
  assert.equal(deals.timeLeft(NOW + 5000, NOW), 5000);
  assert.equal(deals.timeLeft(NOW - 5000, NOW), 0);
  assert.equal(deals.deliveryFeeFor(400, 9999, 10000), 400);
  assert.equal(deals.deliveryFeeFor(400, 10000, 10000), 0);
  assert.equal(deals.deliveryFeeFor(400, 50000), 400, 'no free-delivery terms');
});

test('every seeded deal is valid and refers to a part the shop has in stock', () => {
  const seed = promos.martDeals(NOW);
  for (const d of seed) assert.equal(deals.validateDeal(d, NOW), null, d.id);
  const live = promos.liveDeals(NOW, GALLE);
  assert.equal(live.length, seed.length, 'each deal finds its stock line');
  for (const v of live) {
    assert.ok(v.now < v.was, v.deal.id);
    assert.ok(v.left > 0 && v.saving === v.was - v.now);
  }
  for (let i = 1; i < live.length; i++) assert.ok(live[i].deal.discountPercent <= live[i - 1].deal.discountPercent, 'best discount first');
});

test('a deal that ended is not shown', () => {
  const seed = promos.martDeals(NOW);
  const later = promos.liveDeals(NOW + 8 * 60 * 60 * 1000, GALLE, seed);
  assert.ok(!later.some((v) => v.deal.id === 'md4'), 'the 6-hour deal has ended');
  assert.equal(promos.liveDeals(NOW + 30 * DAY, GALLE, seed).length, 0);
});

test('a running deal can be looked up by shop, part and type', () => {
  assert.equal(promos.dealFor('ps1', 'Brake pads (front)', 'OEM', NOW).id, 'md1');
  assert.equal(promos.dealFor('ps1', 'Brake pads (front)', 'GarageChoice', NOW).id, 'md1');
  assert.equal(promos.dealFor('ps1', 'Brake pads (front)', 'Genuine', NOW), undefined);
  assert.equal(promos.dealFor('ps2', 'Brake pads (front)', 'OEM', NOW), undefined);
});

test('banners belong to shops that bought a placement; every target leads somewhere real', () => {
  const banners = promos.martBanners(NOW);
  assert.ok(banners.length >= 3);
  for (const b of banners) {
    assert.ok(promos.SPONSORED_SHOP_IDS.includes(b.shopId), `${b.id}: a paid placement`);
    assert.ok(shopsData.martShop(b.shopId), b.id);
    assert.ok(deals.isLive(b.endsAt, NOW), b.id);
    assert.equal(b.stops.length, 2);
  }
  const targets = [...banners, ...promos.martOffers(NOW)].map((x) => x.target);
  for (const t of targets) {
    if (t.kind === 'shop') assert.ok(shopsData.martShop(t.shopId), t.shopId);
    if (t.kind === 'kit') assert.ok(kits.SERVICE_KITS.some((k) => k.id === t.kitId), t.kitId);
    if (t.kind === 'search') assert.ok(mart.canonicalPartName(t.query), t.query);
  }
});

test('the part strip opens searches that find a real part somewhere', () => {
  assert.ok(promos.PART_GROUPS.length >= 6);
  for (const g of promos.PART_GROUPS) {
    const part = mart.canonicalPartName(g.query);
    assert.ok(part, g.id);
    assert.ok(shopsData.MART_SHOPS.some((s) => shopsData.availabilityAt(s.id, part)), `${g.id}: ${part} is stocked`);
  }
});

test('the organic rows come from the shops\' own numbers', () => {
  const shops = shopsData.shopsNear(GALLE);
  const rows = deals.organicRows(shops, promos.martShopInfo(NOW), NOW);
  assert.equal(rows.nearest[0].id, 'ps1');
  assert.deepEqual(rows.newlyJoined.map((s) => s.id), ['ps9', 'ps6'], 'newest first');
  for (const r of Object.values(rows)) assert.ok(r.length <= 6);
  for (let i = 1; i < rows.fast.length; i++) assert.ok(rows.fast[i].stats.avgResponseMin >= rows.fast[i - 1].stats.avgResponseMin);
  assert.ok(rows.fast.every((s) => s.stats.ordersDone >= 20), 'a reply speed needs orders behind it');
  assert.ok(rows.liveStock.every((s) => s.liveStock));
  for (let i = 1; i < rows.topRated.length; i++) assert.ok(rows.topRated[i].rating <= rows.topRated[i - 1].rating + 0.001);
});

test('ads never change the organic rows or the ranking', () => {
  const shops = shopsData.shopsNear(GALLE);
  const info = promos.martShopInfo(NOW);
  const before = JSON.stringify(deals.organicRows(shops, info, NOW));
  const rankBefore = ['rating', 'price', 'response', 'service', 'distance'].map((s) => mart.rankShops(shops, s).map((x) => x.id).join());
  const featured = deals.featuredShops(shops, promos.SPONSORED_SHOP_IDS);
  assert.deepEqual(featured.map((s) => s.id), ['ps4', 'ps8', 'ps1'], 'in the order the placements were bought');
  assert.equal(JSON.stringify(deals.organicRows(shops, info, NOW)), before);
  assert.deepEqual(['rating', 'price', 'response', 'service', 'distance'].map((s) => mart.rankShops(shops, s).map((x) => x.id).join()), rankBefore);
  // A different set of paid placements leaves the organic rows exactly as they were.
  deals.featuredShops(shops, ['ps2', 'ps5', 'ps10']);
  assert.equal(JSON.stringify(deals.organicRows(shops, info, NOW)), before);
});

test('the Featured row: open sponsored shops only, unknown ids skipped', () => {
  const shops = shopsData.shopsNear(GALLE);
  const row = deals.featuredShops(shops, ['ps5', 'nobody', 'ps1']);
  assert.deepEqual(row.map((s) => s.id), ['ps1'], 'ps5 is closed, nobody does not exist');
});
