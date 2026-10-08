// Service kits and trade agreements (constants/serviceKits.ts, constants/martShops.ts).
const test = require('node:test');
const assert = require('node:assert/strict');
const load = require('./load.cjs');

const d = load('constants/martShops');
const k = load('constants/serviceKits');

const GALLE = { latitude: 6.0329, longitude: 80.2168 };

test('every kit part is a real part some shop stocks', () => {
  for (const kit of k.SERVICE_KITS) {
    assert.ok(kit.lines.length >= 3, kit.id);
    for (const l of kit.lines) assert.ok(d.MART_SHOPS.some((s) => d.availabilityAt(s.id, l.name)), `${kit.id}: ${l.name}`);
  }
});

test('a kit ranks shops with every part first, cheapest total first', () => {
  const brake = k.SERVICE_KITS.find((x) => x.id === 'brake');
  const offers = k.kitOffers(brake, d.shopsNear(GALLE).filter((s) => s.distanceKm <= 50));
  const complete = offers.filter((o) => o.complete);
  assert.ok(complete.length >= 2);
  assert.equal(complete[0].shop.id, 'ps1');
  // pads (OEM 6,900) + 2 discs (OEM 9,200 each) + fluid (OEM 1,300)
  assert.equal(complete[0].total, 6900 + 2 * 9200 + 1300);
  for (let i = 1; i < complete.length; i++) assert.ok(complete[i].total >= complete[i - 1].total);
  assert.deepEqual(offers.slice(0, complete.length), complete, 'complete kits come first');
  const partial = offers.find((o) => !o.complete);
  assert.ok(partial.missing.length > 0 && partial.have < partial.need);
});

test('a kit needs enough of a part, not just one', () => {
  const kit = { id: 't', name: 't', icon: '', note: '', lines: [{ name: 'Brake disc', qty: 3 }] };
  const ps3 = d.martShop('ps3');
  const ps1 = d.martShop('ps1');
  // ps3 shows Recon 2 + OEM 3 discs but the cheapest suitable line has only 2 in Recon: three are not available there; ps1 has 4 OEM.
  const offers = k.kitOffers(kit, [ps3, ps1]);
  assert.equal(offers.find((o) => o.shop.id === 'ps1').complete, true);
  assert.equal(offers.find((o) => o.shop.id === 'ps3').complete, true, 'ps3 has 3 OEM discs');
  const four = k.kitOffers({ ...kit, lines: [{ name: 'Brake disc', qty: 5 }] }, [ps3, ps1]);
  assert.ok(four.every((o) => !o.complete));
});

test('trade agreements: a garage\'s agreed discount at a shop', () => {
  assert.equal(d.tradeDiscount('g-topcode', 'ps1'), 5);
  assert.equal(d.tradeDiscount('g-topcode', 'ps2'), 0);
  assert.equal(d.tradeDiscount('someone-else', 'ps1'), 0);
  assert.equal(d.tradeDiscount(undefined, 'ps1'), 0);
  for (const a of d.TRADE_AGREEMENTS) {
    assert.ok(a.discountPercent > 0 && a.discountPercent <= 10, `${a.garageId} at ${a.shopId}`);
    assert.ok(d.martShop(a.shopId), a.shopId);
  }
});
