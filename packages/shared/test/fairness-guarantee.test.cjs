// Fair-share intake, subscriptions and the OnGarage Guarantee (marketplace/fairness.ts,
// marketplace/guarantee.ts).
const test = require('node:test');
const assert = require('node:assert/strict');
const load = require('./load.cjs');

const fair = load('marketplace/fairness');
const guar = load('marketplace/guarantee');
const DAY = 24 * 60 * 60 * 1000;

test('intake: only flagged garages, by value, capacity-aware', () => {
  assert.equal(fair.computeIntake({ limited: false, mechanicsPresent: 3, todaysJobValues: [90000] }).limit, Infinity);
  const small = fair.computeIntake({ limited: true, mechanicsPresent: 3, todaysJobValues: [2500, 2000, 2800, 1500, 2900, 2600] });
  assert.equal(small.used, 0, 'jobs under the low-value threshold do not count');
  assert.ok(fair.computeIntake({ limited: true, mechanicsPresent: 3, todaysJobValues: [40000, 38000] }).reached);
  const big = fair.computeIntake({ limited: true, mechanicsPresent: 8, todaysJobValues: [40000, 38000] });
  assert.equal(big.limit, 150000);
  assert.equal(big.reached, false);
  const seeded = fair.computeIntake({ limited: true, mechanicsPresent: 3, todaysJobValues: [15500, 8200, 38000, 9500, 2500] });
  assert.deepEqual([seeded.limit, seeded.used, seeded.remaining], [75000, 71200, 3800]);
  assert.equal(fair.computeIntake({ limited: true, mechanicsPresent: 3, todaysJobValues: [71200], planMultiplier: 3 }).remaining, 153800);
});

test('direct bookings over the limit move to the first day with room', () => {
  const d0 = fair.dayStart(Date.now());
  const room = { [d0]: 1000, [d0 + DAY]: 3800, [d0 + 2 * DAY]: 75000 };
  const remainingOn = (d) => room[d] ?? 75000;
  assert.equal(fair.firstDayWithRoom(d0, 8000, remainingOn), d0 + 2 * DAY);
  assert.equal(fair.firstDayWithRoom(d0 + DAY, 3000, remainingOn), d0 + DAY);
  assert.equal(fair.firstDayWithRoom(d0, 2500, () => 0), d0, 'small jobs always fit');
});

test('monitoring flags: share and earnings, only after 3 months', () => {
  assert.equal(fair.fairnessFlags({ areaShareByCategory: { 7: 0.32, 1: 0.1 }, avgMonthlyEarnings: 520000, monthsObserved: 3 }, () => 'Brake').length, 2);
  assert.equal(fair.fairnessFlags({ areaShareByCategory: { 7: 0.5 }, avgMonthlyEarnings: 900000, monthsObserved: 2 }, () => 'x').length, 0);
});

test('plans: priced by earnings band, never sell level features, value guarantee', () => {
  assert.equal(fair.planFor(200000).id, 'growth');
  assert.equal(fair.planFor(520000).id, 'pro');
  assert.equal(fair.planFor(1200000).id, 'premier');
  for (const p of fair.PLANS) for (const perk of p.perks) assert.ok(!/ආරක්ෂිත රැකියා|ඉහළ වටිනාකමැති/.test(perk), `${p.id}: ${perk}`);
  assert.deepEqual(fair.valueGuarantee(9900, 24750), { target: 49500, met: false, credit: 4950 });
  assert.equal(fair.valueGuarantee(9900, 60000).credit, 0);
});

test('guarantee: eligibility from the job record, deductible, caps', () => {
  const job = {
    stage: 'closed',
    closeCode: '123456',
    closedAt: 1,
    protected: true,
    checkInPhotos: ['a'],
    handover: { checklist: [], afterPhotos: ['b'], oldPartsKept: true, bill: { labour: 0, parts: 0, total: 0 }, readyAt: 0 },
    warrantyUntil: Date.now() + DAY,
  };
  assert.deepEqual(guar.claimBlockers(guar.eligibilityOf(job, Date.now())), []);
  assert.equal(guar.claimBlockers(guar.eligibilityOf({ ...job, checkInPhotos: [] }, Date.now())).length, 1);
  assert.equal(guar.claimBlockers({ protectedJob: true, closedWithCode: false, documented: true, withinWarranty: false }).length, 2);
  assert.deepEqual(guar.claimSplit(30000), { garagePays: 5000, guaranteePays: 25000, ownerUncovered: 0 });
  assert.equal(guar.claimSplit(90000).guaranteePays, 50000);
});
