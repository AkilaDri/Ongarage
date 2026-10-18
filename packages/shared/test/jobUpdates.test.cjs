// What goes into a job's chat while the work goes on (marketplace/jobUpdates.ts).
const test = require('node:test');
const assert = require('node:assert/strict');
const load = require('./load.cjs');

const u = load('marketplace/jobUpdates');
const w = load('marketplace/workshop');

const base = () => w.newWorkshopProgress();
const texts = (a, b) => u.workshopUpdateTexts(a, b).map((x) => x.text);
const sides = (a, b) => u.workshopUpdateTexts(a, b).map((x) => x.from);

test('nothing is written for the first look at a job, or when nothing changed', () => {
  assert.deepEqual(texts(undefined, base()), []);
  const p = base();
  assert.deepEqual(texts(p, { ...p }), []);
});

test('the vehicle received, the diagnosis sent with its new parts, and the repair started are told in order', () => {
  const p0 = base();
  const p1 = { ...p0, stage: 'received' };
  assert.match(texts(p0, p1)[0], /වාහනය ලැබුණා/);
  const diagnosis = { findings: 'x', lines: [{ id: 'l1', kind: 'part', name: 'Brake pads', qty: 1, price: 5800 }, { id: 'l2', kind: 'labour', name: 'Fitting', qty: 1, price: 1500 }], revisedTotal: 7300, finishBy: 1, sentAt: 1 };
  const p2 = { ...p1, stage: 'awaitingApproval', diagnosis };
  const sent = texts(p1, p2);
  assert.equal(sent.length, 1);
  assert.match(sent[0], /Brake pads/);
  assert.match(sent[0], /Fitting/);
  const p3 = { ...p2, stage: 'repairing', decision: { approvedLineIds: ['l1', 'l2'], declinedLineIds: [], decidedAt: 2 } };
  const started = texts(p2, p3);
  assert.match(started[0], /අනුමත කළා/);
  assert.match(started[1], /අලුත්වැඩියාව ආරම්භ/);
});

test('what the garage does is the garage\'s line and the owner\'s answer is the owner\'s', () => {
  const diagnosis = { findings: 'x', lines: [{ id: 'l1', kind: 'labour', name: 'Fitting', qty: 1, price: 1500 }], revisedTotal: 1500, finishBy: 1, sentAt: 1 };
  const p1 = { ...base(), stage: 'awaitingApproval', diagnosis };
  assert.deepEqual(sides(base(), p1), ['garage']);
  const p2 = { ...p1, stage: 'repairing', decision: { approvedLineIds: ['l1'], declinedLineIds: [], decidedAt: 2 } };
  assert.deepEqual(sides(p1, p2), ['owner', 'garage']);
  const byPhone = { ...p2, decision: { ...p2.decision, via: 'phone' } };
  assert.equal(sides(p1, byPhone)[0], 'garage');
});

test('extra work found, and what the owner said about it, including by phone or put aside', () => {
  const p0 = { ...base(), stage: 'repairing' };
  const extra = { id: 'x1', reason: 'Disc worn', lines: [{ id: 'xl', kind: 'part', name: 'Brake disc', qty: 2, price: 9000 }], sentAt: 1 };
  const found = texts(p0, { ...p0, extras: [extra] });
  assert.equal(found.length, 1);
  assert.match(found[0], /අමතර කොටස්/);
  assert.match(found[0], /Brake disc ×2/);
  // parts and work together go out as two separate messages, each with its own total
  const both = { ...extra, lines: [...extra.lines, { id: 'xw', kind: 'labour', name: 'Disc fitting', qty: 1, price: 1500 }] };
  const two = texts(p0, { ...p0, extras: [both] });
  assert.equal(two.length, 2);
  assert.match(two[0], /අමතර කොටස්.*Brake disc/s);
  assert.match(two[1], /අමතර වැඩ.*Disc fitting/s);
  assert.doesNotMatch(two[0], /Disc fitting/);
  assert.match(found[0], /Brake disc ×2/);
  const byPhone = texts({ ...p0, extras: [extra] }, { ...p0, extras: [{ ...extra, decision: { approvedLineIds: ['xl'], declinedLineIds: [], decidedAt: 2, via: 'phone' } }] });
  assert.match(byPhone[0], /දුරකථන/);
  const aside = texts({ ...p0, extras: [extra] }, { ...p0, extras: [{ ...extra, decision: { approvedLineIds: [], declinedLineIds: ['xl'], decidedAt: 2, via: 'deferred' } }] });
  assert.match(aside[0], /පසෙක/);
});

test('ready for handover names the parts that were fitted; a routine service writes its record', () => {
  const diagnosis = { findings: 'x', lines: [{ id: 'l1', kind: 'part', name: 'Oil filter', qty: 1, price: 1650 }], revisedTotal: 1650, finishBy: 1, sentAt: 1 };
  const p0 = { ...base(), stage: 'repairing', diagnosis, decision: { approvedLineIds: ['l1'], declinedLineIds: [], decidedAt: 1 } };
  const ready = texts(p0, { ...p0, stage: 'readyForHandover' });
  assert.match(ready[0], /Oil filter/);
  const service = { kind: 'oil', fluids: ['engineOil'], mileageKm: 84500, nextServiceKm: 89500 };
  const withService = texts(p0, { ...p0, handover: { checklist: [], oldPartsKept: false, bill: { labour: 0, parts: 0, total: 0 }, readyAt: 1, service } });
  assert.match(withService[0], /84,500 km/);
});

test('parts updates say what was asked, ordered and received', () => {
  assert.match(u.partsUpdateText('asked', ['Brake pads']), /ඉල්ලීමක්/);
  assert.match(u.partsUpdateText('ordered', ['Brake pads']), /ඇණවුම්/);
  assert.match(u.partsUpdateText('received', ['Brake pads']), /ලැබුණා/);
});
