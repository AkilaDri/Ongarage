const test = require('node:test');
const assert = require('node:assert/strict');
const { buildBill, billHtml, billText } = require('../.test-build/marketplace/billDocument');
const { billWithLate, LATE_VIA_LABEL } = require('../.test-build/marketplace/workshop');

const progress = (extra = {}) => ({
  stage: 'readyForHandover',
  closeCode: '123456',
  handover: { checklist: [], oldPartsKept: false, bill: { labour: 5500, parts: 2000, total: 7500 }, readyAt: 1_700_000_000_000 },
  ...extra,
});

test('lines added at handover join the bill, labour and parts apart', () => {
  const late = [
    { id: 'l1', kind: 'labour', name: 'Wheel alignment', qty: 1, price: 1500, via: 'phone' },
    { id: 'l2', kind: 'part', name: 'Wiper blades', qty: 1, price: 900, via: 'inPerson' },
  ];
  assert.deepEqual(billWithLate({ labour: 5000, parts: 2000, total: 7000 }, late), { labour: 6500, parts: 2900, total: 9400 });
  assert.deepEqual(billWithLate({ labour: 5000, parts: 2000, total: 7000 }), { labour: 5000, parts: 2000, total: 7000 });
  assert.ok(LATE_VIA_LABEL.phone && LATE_VIA_LABEL.inPerson && LATE_VIA_LABEL.other);
});

test('the bill document names the garage, customer, lines, how added lines were agreed, and the total', () => {
  const late = [{ id: 'l1', kind: 'labour', name: 'Wheel alignment', qty: 1, price: 1500, via: 'phone' }];
  const p = progress({ handover: { checklist: [], oldPartsKept: false, lateLines: late, bill: { labour: 7000, parts: 0, total: 7000 }, readyAt: 1_700_000_000_000 } });
  const doc = buildBill({ id: 'b-12345678', issuedAt: 1_700_000_000_000, garage: { name: 'TOPCODE Tuning & Service', phone: '077 000 0000' }, customer: { name: 'Nimal', phone: '071 111 1111' }, vehicle: 'Premio · CAD-8821', title: 'Brake job', agreedPrice: 5500, progress: p });
  assert.equal(doc.total, 7000);
  assert.equal(doc.sections[0].lines[0].amount, 5500);
  const added = doc.sections.find((s) => s.lines.some((l) => l.name === 'Wheel alignment'));
  assert.ok(added);
  assert.equal(added.lines[0].note, LATE_VIA_LABEL.phone);
  const html = billHtml(doc);
  assert.match(html, /TOPCODE Tuning &amp; Service/);
  assert.match(html, /LKR 7,000/);
  assert.match(billText(doc), /LKR 7,000/);
});

test('html in names is escaped', () => {
  const doc = buildBill({ id: 'x1', issuedAt: 0, garage: { name: '<b>G</b>' }, customer: { name: 'A' }, vehicle: 'v', title: 't', agreedPrice: 100, progress: progress({ handover: undefined }) });
  assert.doesNotMatch(billHtml(doc), /<b>G<\/b>/);
});
