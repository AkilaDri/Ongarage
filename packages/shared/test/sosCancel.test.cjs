// Owner cancelling an SOS request (marketplace/sosCancel.ts): the rule by stage and the fee owed.
const test = require('node:test');
const assert = require('node:assert/strict');
const load = require('./load.cjs');

const sc = load('marketplace/sosCancel');

test('before a technician is on the way, cancelling is free', () => {
  assert.equal(sc.sosCancelRule('searching'), 'free');
  assert.equal(sc.cancelFeeFor('searching', 500), 0);
  assert.equal(sc.canCancelSos('searching'), true);
});

test('once the technician is on the way, cancelling costs the call-out fee', () => {
  assert.equal(sc.sosCancelRule('enRoute'), 'calloutFee');
  assert.equal(sc.cancelFeeFor('enRoute', 750), 750);
  assert.equal(sc.canCancelSos('enRoute'), true);
});

test('once the technician has arrived, cancelling is locked', () => {
  assert.equal(sc.sosCancelRule('arrived'), 'locked');
  assert.equal(sc.canCancelSos('arrived'), false);
  assert.equal(sc.cancelFeeFor('arrived', 750), 0);
});

test('during the repair and after it, cancelling is locked', () => {
  assert.equal(sc.sosCancelRule('repairing'), 'locked');
  assert.equal(sc.sosCancelRule('completed'), 'locked');
  assert.equal(sc.canCancelSos('completed'), false);
});

test('the fee never includes the repair charge', () => {
  // Only the call-out fee is ever owed on cancelling; the repair and parts are not part of the cancel fee.
  assert.equal(sc.cancelFeeFor('enRoute', 500), 500);
  assert.equal(sc.cancelFeeFor('enRoute', 500) < 3500, true);
});
