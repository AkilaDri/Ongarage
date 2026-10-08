// Referrals between garages and parts shops: statuses only move forward, commission is capped and
// earned only after fitting and closing, statements per month for both sides (marketplace/referral.ts).
const test = require('node:test');
const assert = require('node:assert/strict');
const load = require('./load.cjs');

const r = load('marketplace/referral');

const T = new Date(2026, 9, 8, 10).getTime();
const make = (o = {}) =>
  r.newReferral({ id: 'r1', garage: { id: 'g1', name: 'TOPCODE' }, shop: { id: 'ps1', name: 'Galle Auto Parts' }, bookingId: 'b1', lineId: 'p1', partName: 'Brake disc', at: T, ...o });

test('a new referral starts as recommended with the default commission, disclosed', () => {
  const x = make();
  assert.equal(x.status, 'recommended');
  assert.equal(x.commissionPercent, r.DEFAULT_COMMISSION_PERCENT);
  assert.ok(x.disclosed);
  assert.equal(x.history.length, 1);
});

test('commission is capped and rounded', () => {
  assert.equal(r.clampCommission(9), r.COMMISSION_CAP_PERCENT);
  assert.equal(r.clampCommission(-2), 0);
  assert.equal(r.commissionFor(18400, 3), 552);
  assert.equal(r.commissionFor(18400, 20), Math.round((18400 * r.COMMISSION_CAP_PERCENT) / 100));
  assert.equal(make({ commissionPercent: 12 }).commissionPercent, r.COMMISSION_CAP_PERCENT);
});

test('statuses only move forward', () => {
  let x = make();
  x = r.advanceReferral(x, 'viewed', T + 1);
  x = r.advanceReferral(x, 'reserved', T + 2);
  assert.equal(x.status, 'reserved');
  const back = r.advanceReferral(x, 'viewed', T + 3);
  assert.equal(back.status, 'reserved');
  assert.equal(back.history.length, x.history.length);
  assert.equal(r.advanceReferral(x, 'reserved', T + 4), x);
  assert.equal(r.advanceReferral(x, 'returned', T + 5).status, 'reserved', 'only a purchase can be returned');
  assert.equal(r.advanceReferral(make(), 'fitted', T + 1).status, 'fitted', 'moving ahead is allowed');
});

test('a referral nobody bought from lapses; a purchase never lapses', () => {
  assert.equal(r.advanceReferral(make(), 'lapsed', T + 1).status, 'lapsed');
  const bought = r.advanceReferral(make(), 'purchased', T + 1, 18400);
  assert.equal(r.advanceReferral(bought, 'lapsed', T + 2).status, 'purchased');
  assert.equal(r.advanceReferral(r.advanceReferral(make(), 'lapsed', T + 1), 'purchased', T + 2).status, 'lapsed', 'a lapsed referral stays lapsed');
});

test('commission is earned only after fitting AND the job closing with the owner code', () => {
  let x = r.advanceReferral(make(), 'purchased', T + 1, 18400);
  assert.equal(x.amount, 18400);
  assert.equal(x.commission, 0);
  x = r.advanceReferral(x, 'fitted', T + 2);
  assert.equal(x.commission, 0, 'job not closed yet');
  x = r.closeReferral(x, T + 3);
  assert.equal(x.commission, 552);
  const closedFirst = r.closeReferral(r.advanceReferral(make(), 'purchased', T + 1, 18400), T + 2);
  assert.equal(closedFirst.commission, 0, 'not fitted yet');
});

test('a returned part claws the commission back', () => {
  let x = r.closeReferral(r.advanceReferral(r.advanceReferral(make(), 'purchased', T + 1, 18400), 'fitted', T + 2), T + 3);
  assert.equal(x.commission, 552);
  x = r.advanceReferral(x, 'returned', T + 4);
  assert.equal(x.status, 'returned');
  assert.equal(x.commission, 0);
  assert.ok(!r.isSale(x.status));
});

test('the owner never pays more than the listed price of a shop', () => {
  assert.ok(r.referralPriceOk(9200, 9200));
  assert.ok(r.referralPriceOk(9000, 9200));
  assert.ok(!r.referralPriceOk(9500, 9200));
});

test('the disclosure names the garage and the percentage', () => {
  const t = r.referralDisclosure('TOPCODE', 3);
  assert.match(t, /TOPCODE/);
  assert.match(t, /3%/);
});

test('monthly statements: per garage for a shop, per shop for a garage', () => {
  const sold = (id, garage, shop, amount, closed) => {
    let x = r.newReferral({ id, garage, shop, bookingId: id, lineId: 'l', partName: 'p', at: T });
    x = r.advanceReferral(x, 'purchased', T + 1, amount);
    x = r.advanceReferral(x, 'fitted', T + 2);
    return closed ? r.closeReferral(x, T + 3) : x;
  };
  const g1 = { id: 'g1', name: 'TOPCODE' };
  const g2 = { id: 'g2', name: 'Southern' };
  const s1 = { id: 'ps1', name: 'Galle Auto Parts' };
  const s2 = { id: 'ps2', name: 'Southern Spares' };
  const refs = [
    sold('a', g1, s1, 10000, true),
    sold('b', g1, s1, 20000, false),
    sold('c', g2, s1, 5000, true),
    r.newReferral({ id: 'd', garage: g1, shop: s1, bookingId: 'd', lineId: 'l', partName: 'p', at: T }),
    r.advanceReferral(sold('e', g1, s2, 7000, true), 'returned', T + 9),
    { ...sold('old', g1, s1, 99999, true), recommendedAt: new Date(2026, 8, 3).getTime() },
  ];
  const month = r.monthKey(T);
  assert.equal(month, '2026-10');
  const shopRows = r.shopStatement(refs, 'ps1', month);
  assert.deepEqual(shopRows.map((x) => x.garageId), ['g1', 'g2'], 'biggest first');
  assert.deepEqual(shopRows[0], { month, garageId: 'g1', shopId: 'ps1', referrals: 3, purchases: 2, returned: 0, partsValue: 30000, commission: 300 });
  assert.equal(shopRows[1].partsValue, 5000);
  const garageRows = r.garageStatement(refs, 'g1', month);
  assert.deepEqual(garageRows.map((x) => x.shopId), ['ps1', 'ps2']);
  assert.equal(garageRows[1].returned, 1);
  assert.equal(garageRows[1].partsValue, 0, 'a returned part is not revenue');
  const totals = r.statementTotals(garageRows);
  assert.equal(totals.partsValue, 30000);
  assert.equal(totals.referrals, 4);
  assert.deepEqual(r.shopStatement(refs, 'nobody', month), []);
});
