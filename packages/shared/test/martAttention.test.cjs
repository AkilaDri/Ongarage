// What in OnMart needs the buyer's attention while they are elsewhere in the app (marketplace/martAttention.ts).
const test = require('node:test');
const assert = require('node:assert/strict');
const load = require('./load.cjs');

const a = load('marketplace/martAttention');
const enq = (id, audience) => ({ enquiry: { id, audience } });
const none = { enquiries: [], offers: [], purchases: [], threads: [] };

test('a shop that has the part is news; "none" and "will check" are not', () => {
  const items = a.martAttentionItems({
    ...none,
    enquiries: [enq('e1', 'shops')],
    offers: [
      { id: 'o1', enquiryId: 'e1', available: true },
      { id: 'o2', enquiryId: 'e1', available: false, reply: 'none' },
      { id: 'o3', enquiryId: 'e1', available: false, reply: 'check' },
    ],
  });
  assert.deepEqual(items.map((i) => i.key), ['offer:o1:have']);
  assert.equal(items[0].kind, 'requests');
});

test('a reply to a post on the open wall counts on the wall page', () => {
  const items = a.martAttentionItems({ ...none, enquiries: [enq('w1', 'wall'), enq('b1', 'both')], offers: [{ id: 'o1', enquiryId: 'w1', available: true }, { id: 'o2', enquiryId: 'b1', available: true }] });
  assert.deepEqual(items.map((i) => i.kind), ['wall', 'wall']);
});

test('a "will check" that turns into a yes is news again', () => {
  const before = a.martAttentionItems({ ...none, enquiries: [enq('e1', 'shops')], offers: [{ id: 'o1', enquiryId: 'e1', available: false, reply: 'check' }] });
  const after = a.martAttentionItems({ ...none, enquiries: [enq('e1', 'shops')], offers: [{ id: 'o1', enquiryId: 'e1', available: true, reply: 'have' }] });
  assert.equal(before.length, 0);
  assert.equal(after.length, 1);
});

test('an offer for a request that is gone is ignored', () => {
  assert.equal(a.martAttentionItems({ ...none, offers: [{ id: 'o1', enquiryId: 'gone', available: true }] }).length, 0);
});

test('a shop writing back counts only in a conversation the buyer started', () => {
  const answerOnly = { id: 'e1:s1', enquiryId: 'e1', shopId: 's1', messages: [{ id: 'm1', from: 'shop' }] };
  const chat = { id: 'e1:s2', enquiryId: 'e1', shopId: 's2', messages: [{ id: 'm1', from: 'shop' }, { id: 'm2', from: 'buyer' }, { id: 'm3', from: 'shop' }] };
  const buyerLast = { id: 'e1:s3', enquiryId: 'e1', shopId: 's3', messages: [{ id: 'm1', from: 'buyer' }] };
  const items = a.martAttentionItems({ ...none, enquiries: [enq('e1', 'shops')], threads: [answerOnly, chat, buyerLast] });
  assert.deepEqual(items.map((i) => i.key), ['msg:e1:s2:m3']);
});

test('an order the shop moved on is news; a plain reservation is not', () => {
  const items = a.martAttentionItems({
    ...none,
    purchases: [
      { purchase: { id: 'p1' }, stage: 'reserved' },
      { purchase: { id: 'p2' }, stage: 'ready' },
      { purchase: { id: 'p3' }, stage: 'dispatched' },
      { purchase: { id: 'p4' }, stage: 'arrived' },
      { purchase: { id: 'p5' }, stage: 'bought' },
    ],
  });
  assert.deepEqual(items.map((i) => i.key), ['buy:p2:ready', 'buy:p3:dispatched', 'buy:p4:arrived']);
  assert.ok(items.every((i) => i.kind === 'orders'));
});

test('counts leave out what was seen, per page and in all', () => {
  const items = [{ key: 'a', kind: 'requests' }, { key: 'b', kind: 'wall' }, { key: 'c', kind: 'wall' }, { key: 'd', kind: 'orders' }];
  assert.deepEqual(a.countAttention(items, new Set()), { requests: 1, wall: 2, orders: 1, total: 4 });
  assert.deepEqual(a.countAttention(items, new Set(['b', 'd'])), { requests: 1, wall: 1, orders: 0, total: 2 });
  assert.deepEqual(a.keysOf(items, 'wall'), ['b', 'c']);
});
