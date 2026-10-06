// Trust score and the level ladder (marketplace/trust.ts, marketplace/levels.ts).
const test = require('node:test');
const assert = require('node:assert/strict');
const load = require('./load.cjs');

const trust = load('marketplace/trust');
const levels = load('marketplace/levels');
const DAY = 24 * 60 * 60 * 1000;
const r = (sum, count) => ({ sum, count });

test('a few lucky 5★ reviews do not outrank many steady ones; disputes cost', () => {
  const lucky = trust.computeTrustScore({ ratings: { quality: r(15, 3), pricing: r(15, 3), onTime: r(15, 3), communication: r(15, 3) }, jobsAccepted: 3, jobsClosed: 3, disputes: 0, onTimeJobs: 3 });
  const steadyRatings = { quality: r(47 * 4.7, 47), pricing: r(47 * 4.6, 47), onTime: r(47 * 4.5, 47), communication: r(47 * 4.7, 47) };
  const steady = trust.computeTrustScore({ ratings: steadyRatings, jobsAccepted: 50, jobsClosed: 48, disputes: 1, onTimeJobs: 44 });
  const disputed = trust.computeTrustScore({ ratings: steadyRatings, jobsAccepted: 70, jobsClosed: 48, disputes: 6, onTimeJobs: 44 });
  assert.ok(lucky.score < steady.score);
  assert.ok(disputed.score < steady.score);
});

test('weakest dimension (ties go to the heavier weight)', () => {
  assert.equal(trust.weakestDimension({ quality: 4.8, pricing: 4.7, onTime: 4.5, communication: 4.6 }), 'onTime');
  assert.equal(trust.weakestDimension({ quality: 4.5, pricing: 4.5, onTime: 4.9, communication: 4.9 }), 'quality');
  for (const d of trust.RATING_DIMENSIONS) assert.ok(trust.DIMENSION_TIPS[d.id]);
});

test('levels: requirements, cumulative features, progress', () => {
  const stats = { documents: true, closedJobs: 60, score: 4.6, disputeRate: 0.01, monthsOnApp: 4, subscribed: false };
  assert.equal(levels.currentLevel(stats).id, 'trusted');
  assert.equal(levels.currentLevel({ ...stats, closedJobs: 200, monthsOnApp: 8 }).id, 'trusted', 'premier needs a subscription');
  assert.equal(levels.currentLevel({ ...stats, documents: false }).id, 'registered');
  assert.equal(levels.levelProgress(levels.nextLevel('trusted'), stats).filter((p) => !p.met).length, 3);
  const t = levels.entitlementsFor('trusted');
  assert.ok(t.has('sos') && t.has('highValueJobs') && !t.has('protectedJobs'));
  for (const l of levels.LEVELS) for (const f of l.unlocks) assert.ok(levels.FEATURE_INFO[f]?.label, f);
});

test('grace period: dropping below keeps the level for 30 days', () => {
  const now = Date.now();
  assert.deepEqual(levels.effectiveLevel('trusted', 'trusted', undefined, now), { level: 'trusted', graceDaysLeft: undefined });
  assert.equal(levels.effectiveLevel('trusted', 'verified', now, now).level, 'trusted');
  assert.equal(levels.effectiveLevel('trusted', 'verified', now - 12 * DAY, now).graceDaysLeft, 18);
  assert.equal(levels.effectiveLevel('trusted', 'verified', now - 30 * DAY, now).level, 'verified');
  assert.equal(levels.effectiveLevel('verified', 'trusted', undefined, now).level, 'trusted', 'rising is immediate');
});

test('the seeded garage (TOPCODE) is trusted; a second dispute starts its grace period', () => {
  const garage = (disputes) =>
    trust.computeTrustScore({
      ratings: { quality: r(81 * 4.9 + 24, 86), pricing: r(81 * 4.75 + 23, 86), onTime: r(81 * 4.6 + 19, 86), communication: r(81 * 4.8 + 22, 86) },
      jobsAccepted: 73,
      jobsClosed: 69,
      disputes,
      onTimeJobs: 69 - disputes,
    });
  const stats = (t) => ({ documents: true, closedJobs: 69, score: t.score, disputeRate: t.disputeRate, monthsOnApp: 7, subscribed: false });
  assert.equal(levels.currentLevel(stats(garage(1))).id, 'trusted');
  assert.equal(levels.currentLevel(stats(garage(2))).id, 'verified');
});

test('high-value jobs by typical category price', () => {
  assert.equal(levels.isHighValueJob('10'), true);
  assert.equal(levels.isHighValueJob('7'), false);
});
