const test = require('node:test');
const assert = require('node:assert/strict');
const R = require('../.test-build/marketplace/placeReports.js');

const MIN = 60 * 1000;
const NOW = 1_000_000_000_000;
const stock = (id, userId, stockValue, agoMin, over = {}) => ({ id, placeId: 'p1', userId, kind: 'stock', fuel: 'Petrol 92', stock: stockValue, at: NOW - agoMin * MIN, ...over });

test('who may report: only from near the place, once an hour', () => {
  assert.deepEqual(R.canReport(120, undefined, NOW), { ok: true });
  assert.deepEqual(R.canReport(R.REPORT_RADIUS_M, undefined, NOW), { ok: true });
  assert.deepEqual(R.canReport(2300.4, undefined, NOW), { ok: false, reason: 'far', value: 2300 });
  assert.deepEqual(R.canReport(100, NOW - 20 * MIN, NOW), { ok: false, reason: 'cooldown', value: 40 });
  assert.deepEqual(R.canReport(100, NOW - 61 * MIN, NOW), { ok: true });
  // too far wins over the cooldown
  assert.equal(R.canReport(900, NOW - 5 * MIN, NOW).reason, 'far');
});

test('a stock report expires after two hours; a queue report after one', () => {
  assert.equal(R.isFresh(stock('a', 'u', 'out', 119), NOW), true);
  assert.equal(R.isFresh(stock('a', 'u', 'out', 121), NOW), false);
  assert.equal(R.isFresh({ id: 'q', placeId: 'p1', userId: 'u', kind: 'queue', queue: 'long', at: NOW - 61 * MIN }, NOW), false);
  assert.equal(R.isFresh({ id: 'c', placeId: 'p1', userId: 'u', kind: 'charger', plug: 'CCS2', working: false, at: NOW - 3 * 60 * MIN }, NOW), true);
});

test('the crowd decides by majority, a tie by the most recent', () => {
  const reports = [stock('1', 'a', 'out', 50), stock('2', 'b', 'out', 30), stock('3', 'c', 'available', 5)];
  const c = R.crowdStock(reports, 'p1', 'Petrol 92', NOW);
  assert.equal(c.value, 'out');
  assert.equal(c.count, 2);
  assert.equal(c.byOwner, false);
  const tie = R.crowdStock([stock('1', 'a', 'out', 50), stock('2', 'b', 'available', 5)], 'p1', 'Petrol 92', NOW);
  assert.equal(tie.value, 'available');
  assert.equal(R.crowdStock(reports, 'p1', 'Auto Diesel', NOW), null);
  assert.equal(R.crowdStock(reports, 'other', 'Petrol 92', NOW), null);
});

test('expired reports are ignored', () => {
  assert.equal(R.crowdStock([stock('1', 'a', 'out', 300)], 'p1', 'Petrol 92', NOW), null);
});

test("the station's own confirmation counts above the crowd", () => {
  const reports = [stock('1', 'a', 'out', 10), stock('2', 'b', 'out', 12), stock('3', 'staff', 'available', 40, { byOwner: true })];
  const c = R.crowdStock(reports, 'p1', 'Petrol 92', NOW);
  assert.equal(c.value, 'available');
  assert.equal(c.byOwner, true);
  // a confirmation lasts six hours, not two
  assert.equal(R.crowdStock([stock('3', 'staff', 'available', 5 * 60, { byOwner: true })], 'p1', 'Petrol 92', NOW).value, 'available');
  assert.equal(R.crowdStock([stock('3', 'staff', 'available', 7 * 60, { byOwner: true })], 'p1', 'Petrol 92', NOW), null);
});

test('what is shown: fresh reports first, else the listed value; a charger reported broken shows offline', () => {
  assert.equal(R.effectiveStock('available', { value: 'out', count: 2, latestAt: NOW, byOwner: false }), 'out');
  assert.equal(R.effectiveStock('low', null), 'low');
  assert.equal(R.effectiveState('free', { value: false, count: 1, latestAt: NOW, byOwner: false }), 'offline');
  assert.equal(R.effectiveState('free', { value: true, count: 1, latestAt: NOW, byOwner: false }), 'free');
  assert.equal(R.effectiveState('busy', null), 'busy');
});

test('charger and queue reports', () => {
  const rs = [
    { id: '1', placeId: 'p1', userId: 'a', kind: 'charger', plug: 'CCS2', working: false, at: NOW - 30 * MIN },
    { id: '2', placeId: 'p1', userId: 'b', kind: 'charger', plug: 'CCS2', working: false, at: NOW - 20 * MIN },
    { id: '3', placeId: 'p1', userId: 'c', kind: 'charger', plug: 'CCS2', working: true, at: NOW - 5 * MIN },
    { id: '4', placeId: 'p1', userId: 'a', kind: 'queue', queue: 'long', at: NOW - 15 * MIN },
  ];
  assert.equal(R.crowdCharger(rs, 'p1', 'CCS2', NOW).value, false);
  assert.equal(R.crowdCharger(rs, 'p1', 'Type 2', NOW), null);
  assert.equal(R.crowdQueue(rs, 'p1', NOW).value, 'long');
  assert.equal(R.crowdQueue(rs, 'p1', NOW + 2 * 60 * MIN), null);
});

test('reviews: average, one per person per place', () => {
  const rv = [
    { id: '1', placeId: 'p1', userId: 'a', name: 'A', rating: 5, at: 1 },
    { id: '2', placeId: 'p1', userId: 'b', name: 'B', rating: 4, at: 2 },
    { id: '3', placeId: 'p2', userId: 'a', name: 'A', rating: 1, at: 3 },
  ];
  assert.deepEqual(R.summarizeReviews(rv, 'p1'), { avg: 4.5, count: 2 });
  assert.deepEqual(R.summarizeReviews(rv, 'none'), { avg: 0, count: 0 });
  assert.equal(R.canReview(rv, 'p1', 'a'), false);
  assert.equal(R.canReview(rv, 'p1', 'c'), true);
  assert.equal(R.canReview(rv, 'p3', 'a'), true);
});

test('minutes ago is at least one; a restock is what alerts wait for', () => {
  assert.equal(R.minutesAgo(NOW - 20 * 1000, NOW), 1);
  assert.equal(R.minutesAgo(NOW - 20 * MIN, NOW), 20);
  assert.equal(R.stockCameBack('out', 'available'), true);
  assert.equal(R.stockCameBack('low', 'available'), true);
  assert.equal(R.stockCameBack('available', 'available'), false);
  assert.equal(R.stockCameBack('available', 'out'), false);
});
