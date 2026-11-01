const test = require('node:test');
const assert = require('node:assert');
const m = require('../.test-build/marketplace/towing.js');

const at = (h) => { const d = new Date(); d.setHours(h, 0, 0, 0); return d.getTime(); };
const op = (over = {}) => ({ id: 'o', name: 'O', coords: { latitude: 6.03, longitude: 80.21 }, phone: '', rating: 4.5, reviews: 10, trucks: ['Flatbed Towing'], baseFee: 3000, perKm: 200, recoveryFee: 2500, available: true, ...over });
const pickup = { latitude: 6.03, longitude: 80.21 };
const dest = { latitude: 6.07, longitude: 80.21 }; // ~4.4 km straight, ~5.8 km by road

test('condition decides which trucks can do it', () => {
  assert.strictEqual(m.canTow(op(), 'wontRoll'), true);
  assert.strictEqual(m.canTow(op(), 'stuck'), false);
  assert.strictEqual(m.canTow(op({ trucks: ['Recovery Winch'] }), 'stuck'), true);
  assert.strictEqual(m.canTow(op({ trucks: ['Emergency Transport'] }), 'wontRoll'), false);
  assert.strictEqual(m.canTow(op({ available: false }), 'rolls'), false);
});

test('quote: base + trip, pickup beyond the free distance, recovery, night', () => {
  const day = m.towQuote(op(), 3, 10, 'rolls', at(12));
  assert.strictEqual(day.total, 5000); // 3000 + 10 km x 200
  assert.strictEqual(day.pickupFee, 0);
  assert.strictEqual(day.nightFee, 0);
  const far = m.towQuote(op(), 15, 10, 'rolls', at(12));
  assert.strictEqual(far.pickupFee, 1000); // 10 km beyond the free 5 x 100
  assert.strictEqual(far.total, 6000);
  const stuck = m.towQuote(op(), 3, 10, 'stuck', at(12));
  assert.strictEqual(stuck.recoveryFee, 2500);
  assert.strictEqual(stuck.total, 7500);
  const night = m.towQuote(op(), 3, 10, 'rolls', at(23));
  assert.strictEqual(night.nightFee, 1000);
  assert.strictEqual(night.total, 6000);
  assert.strictEqual(m.isNight(at(4)), true);
  assert.strictEqual(m.isNight(at(5)), false);
});

test('limit is the estimate plus 10% and a bigger final price needs approval', () => {
  const q = m.towQuote(op(), 3, 10, 'rolls', at(12));
  assert.strictEqual(q.limit, 5500);
  assert.strictEqual(m.finalNeedsApproval(q, 5500), false);
  assert.strictEqual(m.finalNeedsApproval(q, 5600), true);
});

test('ranking: cheapest first, then sooner, then rating; busy and unsuitable are left out', () => {
  const near = op({ id: 'near', coords: { latitude: 6.031, longitude: 80.21 }, perKm: 250 });
  const cheap = op({ id: 'cheap', coords: { latitude: 6.09, longitude: 80.21 }, perKm: 150, baseFee: 2500 });
  const tie1 = op({ id: 'tieFar', coords: { latitude: 6.1, longitude: 80.21 }, perKm: 250 });
  const busy = op({ id: 'busy', available: false, perKm: 1 });
  const winch = op({ id: 'winch', trucks: ['Recovery Winch'], perKm: 1 });
  const r = m.rankTowOperators([near, tie1, cheap, busy, winch], pickup, dest, 'rolls', at(12));
  assert.deepStrictEqual(r.map((x) => x.op.id), ['cheap', 'near', 'tieFar']);
  assert.ok(r[1].etaMin < r[2].etaMin);
  const withoutAds = m.rankTowOperators([near, cheap], pickup, dest, 'rolls', at(12));
  assert.strictEqual(withoutAds[0].op.id, 'cheap');
  assert.strictEqual(Object.keys(near).includes('sponsored'), false);
});

test('eta follows the distance', () => {
  assert.strictEqual(m.towEtaMin(0), 5);
  assert.strictEqual(m.towEtaMin(15), 35);
});

test('stages: cancel only before arrival, closed once nothing waits', () => {
  const base = { id: 'r', stage: 'accepted' };
  assert.strictEqual(m.canCancelTow(base), true);
  assert.strictEqual(m.canCancelTow({ ...base, stage: 'arrived' }), false);
  assert.strictEqual(m.canCancelTow({ ...base, cancelled: true }), false);
  assert.strictEqual(m.towClosed({ ...base, stage: 'delivered' }), true);
  assert.strictEqual(m.towClosed({ ...base, stage: 'delivered', approval: 'pending' }), false);
  assert.strictEqual(m.towClosed({ ...base, stage: 'transporting' }), false);
});
