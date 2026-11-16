const test = require('node:test');
const assert = require('node:assert');
const m = require('../.test-build/marketplace/bookingSlots.js');

const at = (day, h) => { const d = new Date(2026, 10, day, h, 0, 0, 0); return d.getTime(); };

test('a time inside the opening hours is confirmed', () => {
  assert.deepStrictEqual(m.garageAnswerFor(at(16, 8)), { kind: 'confirm' });
  assert.deepStrictEqual(m.garageAnswerFor(at(16, 14)), { kind: 'confirm' });
  assert.deepStrictEqual(m.garageAnswerFor(at(16, 16)), { kind: 'confirm' });
});

test('after closing, the garage proposes 9:00 the next day', () => {
  const a = m.garageAnswerFor(at(16, 18));
  assert.strictEqual(a.kind, 'propose');
  assert.strictEqual(a.at, at(17, 9));
});

test('before opening, the garage proposes 9:00 the same day', () => {
  const a = m.garageAnswerFor(at(16, 6));
  assert.strictEqual(a.kind, 'propose');
  assert.strictEqual(a.at, at(16, 9));
});

test('the owner has 24 hours to pick a time after accepting', () => {
  assert.strictEqual(m.pickTimeDeadline(1000), 1000 + 24 * 60 * 60 * 1000);
  assert.strictEqual(m.PICK_TIME_WITHIN_MS, 24 * 60 * 60 * 1000);
});

test('every booking slot start is a whole hour', () => {
  for (const h of m.BOOKING_SLOT_HOURS) assert.ok(Number.isInteger(h) && h >= 0 && h <= 23);
});
