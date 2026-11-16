// Garages rating customers fairly (marketplace/customerRating.ts): who can be rated, what counts, expiry, disputes, settling.
const test = require('node:test');
const assert = require('node:assert/strict');
const load = require('./load.cjs');

const cr = load('marketplace/customerRating');
const pay = load('marketplace/payment');
const w = load('marketplace/workshop');

const DAY = 24 * 60 * 60 * 1000;
const NOW = new Date(2026, 9, 15, 12, 0, 0).getTime();
const rating = (o = {}) => ({ id: 'r1', jobId: 'j1', garage: 'G', stars: 5, tags: ['paidOnTime'], at: NOW - 5 * DAY, ...o });

test('only a closed job can be rated, and only once', () => {
  const closed = { ...w.newWorkshopProgress(), stage: 'closed' };
  assert.equal(cr.canRateCustomer(closed), true);
  assert.equal(cr.canRateCustomer({ ...closed, customerRating: rating() }), false);
  assert.equal(cr.canRateCustomer({ ...w.newWorkshopProgress(), stage: 'repairing' }), false);
  assert.equal(cr.canRateCustomer(undefined), false);
});

test('a rating counts for a year, then it expires', () => {
  assert.equal(cr.ratingCounts(rating(), NOW), true);
  assert.equal(cr.ratingCounts(rating({ at: NOW - 400 * DAY }), NOW), false);
});

test('a disputed rating does not count until it is withdrawn', () => {
  const disputed = rating({ dispute: { note: 'x', at: NOW, status: 'open' } });
  assert.equal(cr.ratingCounts(disputed, NOW), false);
  assert.equal(cr.ratingCounts({ ...disputed, dispute: { ...disputed.dispute, status: 'withdrawn' } }, NOW), true);
});

test('the record combines payment behaviour and the ratings that count', () => {
  const rec = cr.summarizeCustomer([rating({ stars: 5 }), rating({ id: 'r2', stars: 4, tags: ['paidOnTime', 'polite'] })], [pay.makePayment(5000, 5000, { now: NOW })], NOW);
  assert.equal(rec.level, 'good');
  assert.equal(rec.rated, 2);
  assert.equal(rec.avgStars, 4.5);
  assert.equal(rec.topTags[0].tag, 'paidOnTime');
  assert.equal(rec.topTags[0].count, 2);
});

test('low ratings make the record worse even with no payment trouble', () => {
  assert.equal(cr.summarizeCustomer([rating({ stars: 2, tags: ['rude'] })], [], NOW).level, 'poor');
  assert.equal(cr.summarizeCustomer([rating({ stars: 3 })], [], NOW).level, 'fair');
});

test('a disputed rating is left out and counted as disputed', () => {
  const rec = cr.summarizeCustomer([rating({ stars: 1, tags: ['unpaid'], dispute: { note: 'x', at: NOW, status: 'open' } })], [], NOW);
  assert.equal(rec.rated, 0);
  assert.equal(rec.disputed, 1);
  assert.equal(rec.level, 'new');
});

test('paying the balance turns "did not pay" into "paid late"', () => {
  const s = cr.settleCustomerRating(rating({ tags: ['unpaid', 'polite'] }));
  assert.deepEqual(s.tags, ['paidLate', 'polite']);
  assert.deepEqual(cr.settleCustomerRating(rating()).tags, ['paidOnTime']);
});
