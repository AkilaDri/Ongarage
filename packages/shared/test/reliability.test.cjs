// How reliably a customer pays garages, and when new work is limited (marketplace/reliability.ts, marketplace/payment.ts).
const test = require('node:test');
const assert = require('node:assert/strict');
const load = require('./load.cjs');

const pay = load('marketplace/payment');
const rel = load('marketplace/reliability');

const DAY = 24 * 60 * 60 * 1000;
const NOW = new Date(2026, 9, 15, 12, 0, 0).getTime();
const day = (n) => new Date(NOW + n * DAY).setHours(9, 0, 0, 0);

const paid = (total = 5000, extra = {}) => ({ ...pay.makePayment(total, total, { now: NOW }), ...extra });
const owing = (total, received, daysFromNow, extra = {}) => ({ ...pay.makePayment(total, received, { promisedAt: day(daysFromNow), now: NOW }), confirm: 'confirmed', ...extra });

test('no records: a new customer, nothing limited', () => {
  const s = rel.payStanding([], NOW);
  assert.equal(s.level, 'new');
  assert.equal(s.limited, false);
  assert.equal(s.warn, false);
});

test('paid in full on time: good', () => {
  const s = rel.payStanding([paid(), paid(8000)], NOW);
  assert.equal(s.level, 'good');
  assert.equal(s.paidInFull, 2);
  assert.equal(s.owed, 0);
});

test('a balance not due yet is good; due today is a warning, not a limit', () => {
  assert.equal(rel.payStanding([owing(8000, 3000, 2)], NOW).level, 'good');
  const today = rel.payStanding([owing(8000, 3000, 0)], NOW);
  assert.equal(today.warn, true);
  assert.equal(today.limited, false);
});

test('paid in full but only after a missed day: fair', () => {
  const s = rel.payStanding([paid(5000, { missedCount: 1 })], NOW);
  assert.equal(s.level, 'fair');
  assert.equal(s.paidLate, 1);
});

test('a small balance a few days late warns but does not limit', () => {
  const s = rel.payStanding([owing(8000, 5000, -3)], NOW);
  assert.equal(s.overdueDays, 3);
  assert.equal(s.warn, true);
  assert.equal(s.limited, false);
  assert.equal(s.level, 'fair');
});

test('limited once a balance is 7 days late', () => {
  const s = rel.payStanding([owing(8000, 5000, -7)], NOW);
  assert.equal(s.limited, true);
  assert.equal(s.level, 'poor');
  assert.match(s.reason, /7/);
});

test('limited when an overdue balance and everything owed reach the limit', () => {
  const s = rel.payStanding([owing(9000, 1000, -1), owing(4000, 1000, 5)], NOW);
  assert.equal(s.owed, 11000);
  assert.equal(s.limited, true);
});

test('a disputed balance is not counted while it is being settled', () => {
  const s = rel.payStanding([owing(8000, 1000, -20, { confirm: 'disputed' })], NOW);
  assert.equal(s.limited, false);
  assert.equal(s.owed, 0);
});

test('paying the balance lifts the limit', () => {
  const late = owing(8000, 5000, -10);
  assert.equal(rel.payStanding([late], NOW).limited, true);
  const settled = pay.collectPayment(late, late.balance, { now: NOW });
  const s = rel.payStanding([settled], NOW);
  assert.equal(s.limited, false);
  assert.equal(s.owed, 0);
});

test('repeatedly missed promises make the record poor even once paid', () => {
  assert.equal(rel.payStanding([paid(5000, { missedCount: 3 })], NOW).level, 'poor');
});
