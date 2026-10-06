// Workshop jobs: steps, the bill, parts at the right time, extra work, Recon, warranty,
// part prices and the closing / pickup codes (marketplace/workshop.ts, partPrices.ts,
// closeCode.ts).
const test = require('node:test');
const assert = require('node:assert/strict');
const load = require('./load.cjs');

const w = load('marketplace/workshop');
const pp = load('marketplace/partPrices');
const code = load('marketplace/closeCode');

const lines = [
  { id: 'p1', kind: 'part', name: 'Brake pads (front)', qty: 1, partType: 'OEM', source: 'order', price: 6850 },
  { id: 'p2', kind: 'part', name: 'Brake fluid', qty: 1, partType: 'OEM', source: 'stock', price: 1350 },
  { id: 'l1', kind: 'labour', name: 'Brake fluid flush', qty: 1, price: 1800 },
];
const base = { stage: 'repairing', closeCode: '123456', diagnosis: { findings: 'x', lines, revisedTotal: 0, finishBy: 0, sentAt: 0 } };
const decided = (ids) => ({ ...base, decision: { approvedLineIds: ids, declinedLineIds: lines.map((l) => l.id).filter((x) => !ids.includes(x)), decidedAt: 1 } });
const extraLine = { id: 'x2p', kind: 'part', name: 'Brake disc', qty: 2, partType: 'OEM', source: 'order', price: 18400 };

test('steps', () => {
  assert.equal(w.WORKSHOP_STEPS.length, 7);
  assert.equal(w.workshopStepIndex('booked'), 0);
  assert.equal(w.workshopStepIndex('disputed'), w.workshopStepIndex('readyForHandover'));
  assert.equal(w.workshopStepIndex('declined'), 6);
  for (const s of ['booked', 'received', 'diagnosing', 'awaitingApproval', 'repairing', 'readyForHandover', 'closed', 'declined', 'disputed']) assert.ok(w.WORKSHOP_STAGE_TEXT[s], s);
  const fresh = w.newWorkshopProgress();
  assert.equal(fresh.stage, 'booked');
  assert.match(fresh.closeCode, /^\d{6}$/);
});

test('bill: only approved lines; labour and parts separate', () => {
  assert.equal(w.approvedLines(base).length, 0);
  assert.deepEqual(w.workshopBill(3800, base), { labour: 3800, parts: 0, total: 3800 });
  assert.deepEqual(w.workshopBill(3800, decided(['p1', 'p2', 'l1'])), { labour: 5600, parts: 8200, total: 13800 });
  assert.deepEqual(w.workshopBill(3800, decided(['p1', 'p2', 'l1']), 6000), { labour: 5600, parts: 7350, total: 12950 }, 'real ordered-parts cost replaces the estimate');
  assert.deepEqual(w.workshopBill(3800, decided(['p1'])), { labour: 3800, parts: 6850, total: 10650 });
});

test('parts at the right time: ordered once, only after approval', () => {
  const all = decided(['p1', 'p2', 'l1']);
  assert.equal(w.partsStillToOrder(base, []).length, 0);
  assert.deepEqual(w.linesToOrder(all).map((l) => l.id), ['p1']);
  assert.equal(w.partsStillToOrder(all, ['p1']).length, 0);
  const extraApproved = { ...all, extras: [{ id: 'x2', reason: 'r', sentAt: 2, lines: [extraLine], decision: { approvedLineIds: ['x2p'], declinedLineIds: [], decidedAt: 3 } }] };
  assert.deepEqual(w.partsStillToOrder(extraApproved, ['p1']).map((l) => l.id), ['x2p']);
  const extraDeclined = { ...all, extras: [{ id: 'x2', reason: 'r', sentAt: 2, lines: [extraLine], decision: { approvedLineIds: [], declinedLineIds: ['x2p'], decidedAt: 3 } }] };
  assert.equal(w.partsStillToOrder(extraDeclined, ['p1']).length, 0);
});

test('extra work and Recon block handover until answered', () => {
  const pending = { ...decided(['p1']), extras: [{ id: 'x', reason: 'r', sentAt: 2, lines: [{ id: 'xl', kind: 'labour', name: 'Alignment', qty: 1, price: 2500 }] }] };
  assert.ok(w.pendingExtra(pending));
  assert.equal(w.workshopBill(3800, pending).labour, 3800, 'unanswered extra is not billed');
  const answered = { ...pending, extras: [{ ...pending.extras[0], decision: { approvedLineIds: ['xl'], declinedLineIds: [], decidedAt: 3 } }] };
  assert.equal(w.pendingExtra(answered), undefined);
  assert.equal(w.workshopBill(3800, answered).labour, 6300);
  const recon = { ...base, recon: [{ id: 'rc', lineIds: ['p1'], partNames: ['Brake pads (front)'], genuinePrice: 9500, reconPrice: 5250, askedAt: 1, status: 'pending' }] };
  assert.ok(w.pendingRecon(recon));
  assert.equal(w.pendingRecon({ ...recon, recon: [{ ...recon.recon[0], status: 'approved' }] }), undefined);
});

test('warranty end clamps to the end of the month', () => {
  const end = new Date(w.warrantyEnd(new Date(2026, 0, 31).getTime(), 3));
  assert.deepEqual([end.getMonth(), end.getDate()], [3, 30]);
  const mid = new Date(w.warrantyEnd(new Date(2026, 4, 15).getTime(), 6));
  assert.deepEqual([mid.getMonth(), mid.getDate()], [10, 15]);
  assert.equal(w.INSPECTION_FEE, 1500);
});

test('part prices: one market table for every app', () => {
  assert.equal(pp.partMarketPrice('Brake pads (front)', 'Genuine'), 9500);
  assert.equal(pp.partMarketPrice('Brake pads (front)', 'OEM'), 6850);
  assert.equal(pp.partMarketPrice('Brake pads (front)', 'GarageChoice'), 6850, "garage's choice is priced as OEM");
  assert.equal(pp.partMarketPrice('Mystery bracket', 'Recon'), 2750);
  assert.equal(pp.partListPrice('Mystery bracket'), 5000);
});

test('closing and pickup codes', () => {
  const c = code.makeCloseCode();
  assert.match(c, /^\d{6}$/);
  assert.ok(code.checkCloseCode(c, code.formatCloseCode(c)), 'checks with the space');
  assert.equal(code.pickupCodePayload('123456'), 'ongarage:pickup:123456');
});
