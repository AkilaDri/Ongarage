// A parts basket: requests asked together are read as one group (marketplace/partsBatch.ts).
const test = require('node:test');
const assert = require('node:assert/strict');
const load = require('./load.cjs');

const b = load('marketplace/partsBatch');
const m = (id, batchId) => ({ enquiry: { id, batchId } });

test('requests with the same batch are one group, in the order they first appear', () => {
  const g = b.groupByBatch([m('a', 'x'), m('solo'), m('b', 'x'), m('c', 'y'), m('d', 'x')]);
  assert.deepEqual(g.map((x) => x.items.map((i) => i.enquiry.id)), [['a', 'b', 'd'], ['solo'], ['c']]);
  assert.equal(g[0].batchId, 'x');
  assert.equal(g[1].batchId, undefined);
});

test('a request with no batch is a group of its own', () => {
  assert.equal(b.groupByBatch([m('a'), m('b')]).length, 2);
});

test('the basket progress counts the parts that have an answer with the part (or a shop checking)', () => {
  const items = [m('a', 'x'), m('b', 'x'), m('c', 'x')];
  const offers = [
    { enquiryId: 'a', available: true },
    { enquiryId: 'b', available: false, reply: 'check' },
    { enquiryId: 'c', available: false, reply: 'none' },
  ];
  assert.deepEqual(b.basketProgress(items, offers), { total: 3, answered: 2 });
});

test('a basket takes at most ten parts', () => {
  assert.equal(b.MAX_BASKET_PARTS, 10);
});

const o = (enquiryId, shopId, total, extra = {}) => ({ enquiryId, available: true, reply: 'have', unitPrice: total, total, shop: { id: shopId, name: 'Shop ' + shopId }, ...extra });

test('shops are ranked by how much of the basket they have: complete first, then most parts, then cheapest', () => {
  const ids = ['a', 'b', 'c'];
  const offers = [o('a', 's1', 100), o('b', 's1', 100), o('c', 's1', 100), o('a', 's2', 50), o('b', 's2', 50), o('a', 's3', 10)];
  const cov = b.shopCoverage(ids, offers);
  assert.deepEqual(cov.map((c) => c.shopId), ['s1', 's2', 's3']);
  assert.equal(cov[0].complete, true);
  assert.equal(cov[0].total, 300);
  assert.deepEqual(cov[1].missing, ['c']);
});

test('a part a shop said it does not have, or will check, is not counted as covered', () => {
  const ids = ['a', 'b'];
  const cov = b.shopCoverage(ids, [o('a', 's1', 100), o('b', 's1', 0, { available: false, reply: 'none' }), o('a', 's2', 80), o('b', 's2', 0, { available: false, reply: 'check' })]);
  const s1 = cov.find((c) => c.shopId === 's1');
  const s2 = cov.find((c) => c.shopId === 's2');
  assert.deepEqual(s1.missing, ['b']);
  assert.deepEqual(s2.checking, ['b']);
  assert.equal(s2.complete, false);
});

test('the cheapest mix takes the lowest price for each part, from different shops', () => {
  const ids = ['a', 'b'];
  const mix = b.cheapestMix(ids, [o('a', 's1', 100), o('b', 's1', 100), o('a', 's2', 60), o('b', 's2', 130)]);
  assert.equal(mix.total, 160);
  assert.equal(mix.shops, 2);
  assert.equal(mix.complete, true);
});

test('a part nobody has stays missing from the mix', () => {
  const mix = b.cheapestMix(['a', 'b'], [o('a', 's1', 100)]);
  assert.deepEqual(mix.missing, ['b']);
  assert.equal(mix.complete, false);
});

test('the saving of the mix is measured against the best shop that has everything', () => {
  const ids = ['a', 'b'];
  const offers = [o('a', 's1', 100), o('b', 's1', 100), o('a', 's2', 60), o('b', 's2', 130)];
  const cov = b.shopCoverage(ids, offers);
  assert.equal(b.mixSavings(cov, b.cheapestMix(ids, offers)), 30);
  // when the single shop is already the cheapest there is no saving
  const same = [o('a', 's1', 50), o('b', 's1', 50), o('a', 's2', 60), o('b', 's2', 60)];
  assert.equal(b.mixSavings(b.shopCoverage(ids, same), b.cheapestMix(ids, same)), 0);
});

test('parts reserved together are counted as one group, and how many of them are bought', () => {
  const ps = [
    { stage: 'bought', purchase: { groupId: 'g1' } },
    { stage: 'ready', purchase: { groupId: 'g1' } },
    { stage: 'ready', purchase: { groupId: 'g2' } },
    { stage: 'ready', purchase: {} },
  ];
  assert.deepEqual(b.purchaseGroupProgress(ps, 'g1'), { total: 2, bought: 1 });
  assert.deepEqual(b.purchaseGroupProgress(ps, undefined), { total: 0, bought: 0 });
});

test('requests are sorted into going, successful and closed, a basket by its best part', () => {
  const m = (id, status, batchId) => ({ enquiry: { id, status, batchId } });
  const groups = b.groupByBatch([m('a', 'open'), m('b', 'bought'), m('c', 'cancelled'), m('d', 'expired'), m('e', 'bought', 'x'), m('f', 'open', 'x'), m('g', 'cancelled', 'y'), m('h', 'bought', 'y')]);
  const s = b.splitRequests(groups);
  assert.deepEqual(s.current.map((g) => g.items.map((i) => i.enquiry.id)), [['a'], ['e', 'f']]);
  assert.deepEqual(s.successful.map((g) => g.items.map((i) => i.enquiry.id)), [['b'], ['g', 'h']]);
  assert.deepEqual(s.closed.map((g) => g.items.map((i) => i.enquiry.id)), [['c'], ['d']]);
});

test('a shop that will check says by when it answers', () => {
  const now = 1_000_000;
  assert.equal(b.checkWindowText(now + 20 * 60000, now), 'මිනිත්තු 20ක් ඇතුළත දන්වයි');
  assert.equal(b.checkWindowText(now + 90 * 60000, now), 'පැය 2ක් ඇතුළත දන්වයි');
  assert.equal(b.checkWindowText(now - 1, now), 'පිළිතුර ඉක්මනින්');
  assert.deepEqual(b.CHECK_WINDOWS.map((w) => w.min), [30, 60, 180, 1440]);
});

test('a cart line is good for an hour, then has to be picked again', () => {
  const t0 = 5_000_000;
  assert.equal(b.cartExpired(t0, t0 + 59 * 60000), false);
  assert.equal(b.cartExpired(t0, t0 + 60 * 60000), true);
  assert.equal(b.cartLeftMin(t0, t0 + 20 * 60000), 40);
  assert.equal(b.cartLeftMin(t0, t0 + 61 * 60000), 0);
});

test('the cart groups its lines by shop', () => {
  const lines = [{ shopId: 's1', id: 'a' }, { shopId: 's2', id: 'b' }, { shopId: 's1', id: 'c' }];
  const g = b.groupCartByShop(lines);
  assert.deepEqual(g.map((x) => [x.shopId, x.lines.map((l) => l.id)]), [['s1', ['a', 'c']], ['s2', ['b']]]);
});

test('the simulated shops cover a basket in different ways: all, every other part, the rest, all but the last, only the first', () => {
  const cover = (rank) => [0, 1, 2, 3].map((i) => b.demoCoverage(rank, i, 4));
  assert.deepEqual(cover(0), [true, true, true, true]);
  assert.deepEqual(cover(1), [true, false, true, false]);
  assert.deepEqual(cover(2), [false, true, false, true]);
  assert.deepEqual(cover(3), [true, true, true, false]);
  assert.deepEqual(cover(4), [true, false, false, false]);
  assert.equal(b.demoCoverage(5, 0, 4), undefined);
  // one part: the first four shops have it
  assert.deepEqual([0, 1, 2, 3].map((r) => b.demoCoverage(r, 0, 1)), [true, true, true, true]);
});
