const test = require('node:test');
const assert = require('node:assert');
const c = require('../.test-build/marketplace/towCancel.js');

test('a job needed now is free to cancel only while no truck has accepted', () => {
  assert.strictEqual(c.towNowCancelRule('searching'), 'free');
  assert.strictEqual(c.towNowCancelRule('accepted'), 'locked');
  assert.strictEqual(c.towNowCancelRule('enroute'), 'locked');
  assert.strictEqual(c.towNowCancelRule('arrived'), 'locked');
  assert.strictEqual(c.towNowCancelRule('transporting'), 'locked');
  assert.strictEqual(c.towNowCancelRule('delivered'), 'locked');
});

test('a scheduled job: 3 or more days before is free', () => {
  assert.strictEqual(c.scheduledCancelFee(5000, 5), 0);
  assert.strictEqual(c.scheduledCancelFee(5000, 3), 0);
});

test('a scheduled job: 1–2 days before is 5% of the agreed fee', () => {
  assert.strictEqual(c.scheduledCancelFee(5000, 2), 250);
  assert.strictEqual(c.scheduledCancelFee(5000, 1), 250);
});

test('a scheduled job: on the scheduled day is a flat 10%', () => {
  assert.strictEqual(c.scheduledCancelFee(5000, 0), 500);
});

test('a scheduled job: after the slot has passed nothing is charged here', () => {
  assert.strictEqual(c.scheduledCancelFee(5000, -1), 0);
});

test('the search widens through the radius steps, one at a time', () => {
  assert.strictEqual(c.nextTowRadiusKm(3), 6);
  assert.strictEqual(c.nextTowRadiusKm(6), 10);
  assert.strictEqual(c.nextTowRadiusKm(10), 15);
  assert.strictEqual(c.nextTowRadiusKm(15), 25);
  assert.strictEqual(c.nextTowRadiusKm(25), null);
});

test('the owner can stop the widening at any step', () => {
  assert.strictEqual(c.nextTowRadiusKm(3, true), null);
  assert.strictEqual(c.nextTowRadiusKm(10, true), null);
});
