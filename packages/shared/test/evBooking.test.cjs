const test = require('node:test');
const assert = require('node:assert');
const m = require('../.test-build/marketplace/evBooking.js');

const MIN = 60 * 1000;
const place = (over = {}) => ({
  id: 'e1', kind: 'ev', name: 'Hub', brand: 'X', coords: { latitude: 0, longitude: 0 }, address: '', phone: '', open24: true, open: true, services: [], amenities: [],
  connectors: [{ type: 'CCS2', kw: 60, price: 100, states: ['free', 'busy'] }],
  ...over,
});
const at = (h, min = 0) => { const d = new Date(); d.setHours(h, min, 0, 0); return d.getTime(); };
const booking = (over = {}) => ({ id: 'b', placeId: 'e1', plug: 'CCS2', startAt: at(12), durationMin: 60, status: 'booked', code: '123456', createdAt: 0, estKwh: 0, estCost: 0, ...over });

test('parseHours reads "7.00 - 21.00"', () => {
  assert.deepStrictEqual(m.parseHours('7.00 - 21.00'), { from: 420, to: 1260 });
  assert.strictEqual(m.parseHours(undefined), null);
});

test('slots: every 30 min, only the future, whole duration inside opening hours', () => {
  const now = at(8);
  const slots = m.slotsFor(place({ open24: false, hours: '7.00 - 10.00' }), 'CCS2', 0, 60, [], now);
  assert.strictEqual(slots[0].startAt, at(8, 30)); // 8:00 is inside the 15 minute lead
  assert.strictEqual(slots[slots.length - 1].startAt, at(9)); // 9:00 + 60 min ends at 10:00
});

test('slots: a booking fills a plug, the plugs out of order do not count', () => {
  const now = at(6);
  const p = place({ connectors: [{ type: 'CCS2', kw: 60, price: 100, states: ['free', 'offline'] }] });
  const taken = m.slotsFor(p, 'CCS2', 0, 60, [booking({ startAt: at(12) })], now).map((s) => s.startAt);
  assert.ok(!taken.includes(at(12)) && !taken.includes(at(12, 30)) && !taken.includes(at(11, 30)));
  assert.ok(taken.includes(at(13)) && taken.includes(at(11)));
  const two = place();
  const free = m.slotsFor(two, 'CCS2', 0, 60, [booking({ startAt: at(12) })], now).find((s) => s.startAt === at(12));
  assert.strictEqual(free.free, 1);
  assert.deepStrictEqual(m.slotsFor(place({ connectors: [{ type: 'CCS2', kw: 60, price: 100, states: ['offline'] }] }), 'CCS2', 0, 60, [], now), []);
});

test('a cancelled or finished booking frees its slot', () => {
  const now = at(6);
  const p = place({ connectors: [{ type: 'CCS2', kw: 60, price: 100, states: ['free'] }] });
  const s = (b) => m.slotsFor(p, 'CCS2', 0, 60, b, now).some((x) => x.startAt === at(12));
  assert.strictEqual(s([booking()]), false);
  assert.strictEqual(s([booking({ status: 'cancelled' })]), true);
});

test('no-show after the grace time, free cancel until 30 minutes before', () => {
  const b = booking({ startAt: at(12) });
  assert.strictEqual(m.isNoShow(b, at(12, 14)), false);
  assert.strictEqual(m.isNoShow(b, at(12, 16)), true);
  assert.strictEqual(m.isNoShow({ ...b, status: 'charging' }, at(13)), false);
  assert.strictEqual(m.cancelIsFree(b, at(11, 25)), true);
  assert.strictEqual(m.cancelIsFree(b, at(11, 45)), false);
  assert.strictEqual(m.canStartSession(b, at(11, 45)), false);
  assert.strictEqual(m.canStartSession(b, at(11, 55)), true);
  assert.strictEqual(m.canStartSession(b, at(12, 20)), false);
});

test('three no-shows in a month pause booking; overlapping bookings are refused', () => {
  const now = at(9);
  const ns = (i) => booking({ id: 'n' + i, status: 'noShow', closedAt: now - i * 60 * MIN });
  assert.strictEqual(m.canBookSlot(place(), at(12), 60, [ns(1), ns(2)], now).ok, true);
  assert.deepStrictEqual(m.canBookSlot(place(), at(12), 60, [ns(1), ns(2), ns(3)], now), { ok: false, reason: 'noShows' });
  const old = booking({ status: 'noShow', closedAt: now - 40 * 24 * 60 * MIN });
  assert.strictEqual(m.noShowCount([old], now), 0);
  assert.deepStrictEqual(m.canBookSlot(place(), at(12, 30), 60, [booking()], now), { ok: false, reason: 'overlap' });
});

test('estimate is limited by the battery', () => {
  const c = { type: 'CCS2', kw: 120, price: 100, states: ['free'] };
  assert.deepStrictEqual(m.estimateSession(c, 30, 40), { kwh: 40, cost: 4000 });
  assert.strictEqual(m.estimateSession({ ...c, kw: 22 }, 60).kwh, 19.8);
});

test('session: battery rises, slows above 80%, stops at 100%', () => {
  const c = { type: 'CCS2', kw: 50, price: 100, states: ['free'] };
  const early = m.sessionAt(c, 20, 30);
  assert.ok(early.pct > 20 && early.kwh > 0 && early.cost === Math.round(early.kwh * 100));
  const slow = m.sessionAt(c, 80, 10);
  const fast = m.sessionAt(c, 20, 10);
  assert.ok(slow.pct - 80 < fast.pct - 20);
  const full = m.sessionAt(c, 20, 600);
  assert.strictEqual(full.pct, 100);
  assert.strictEqual(full.full, true);
  assert.ok(full.kwh <= 32.1);
});

test('codes: six digits and a QR payload that names the kind', () => {
  assert.match(m.makeEvCode(12345.6), /^\d{6}$/);
  assert.strictEqual(m.evCodePayload('123456'), 'ongarage:ev:123456');
});
