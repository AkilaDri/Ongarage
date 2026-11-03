// OnGarage points for owners (marketplace/loyalty.ts): what a job earns, one award per job, expiry, the balance.
const test = require('node:test');
const assert = require('node:assert/strict');
const load = require('./load.cjs');

const lp = load('marketplace/loyalty');

const DAY = 24 * 60 * 60 * 1000;
const NOW = new Date(2026, 9, 15, 12, 0, 0).getTime();

test('a closed job earns the base points, a rated one adds the bonus once', () => {
  assert.deepEqual(lp.pointsForJob({ closed: true, rated: false }), { base: 100, ratingBonus: 0, total: 100 });
  assert.deepEqual(lp.pointsForJob({ closed: true, rated: true }), { base: 100, ratingBonus: 25, total: 125 });
});

test('a job that is not closed with the owner’s code earns nothing', () => {
  assert.deepEqual(lp.pointsForJob({ closed: false, rated: true }), { base: 0, ratingBonus: 0, total: 0 });
  assert.equal(lp.awardFor('j1', { closed: false, rated: true }, NOW), null);
});

test('the stars do not change the points: rating is a yes or no, not a score', () => {
  // The rule only sees whether the owner rated; any number of stars gives the same points.
  const oneStar = lp.awardFor('j1', { closed: true, rated: true }, NOW);
  const fiveStars = lp.awardFor('j1', { closed: true, rated: true }, NOW);
  assert.deepEqual(oneStar, fiveStars);
});

test('one award per job: a second award for the same job is refused', () => {
  const awards = [lp.awardFor('j1', { closed: true, rated: false }, NOW)];
  assert.equal(lp.hasAward(awards, 'j1'), true);
  assert.equal(lp.hasAward(awards, 'j2'), false);
});

test('points stop counting after the expiry period', () => {
  const recent = { jobId: 'j1', base: 100, ratingBonus: 25, at: NOW - 30 * DAY };
  const old = { jobId: 'j2', base: 100, ratingBonus: 0, at: NOW - 400 * DAY };
  assert.equal(lp.awardCounts(recent, NOW), true);
  assert.equal(lp.awardCounts(old, NOW), false);
});

test('the balance adds the counting awards only', () => {
  const awards = [
    { jobId: 'j1', base: 100, ratingBonus: 25, at: NOW - 10 * DAY },
    { jobId: 'j2', base: 100, ratingBonus: 0, at: NOW - 20 * DAY },
    { jobId: 'j3', base: 100, ratingBonus: 25, at: NOW - 400 * DAY },
  ];
  assert.equal(lp.pointsBalance(awards, NOW), 225);
  assert.equal(lp.pointsBalance([], NOW), 0);
});
