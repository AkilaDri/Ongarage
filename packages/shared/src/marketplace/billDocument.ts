import { workshopBill, billWithLate, LATE_VIA_LABEL, approvedLines } from './workshop';
import type { DiagnosisLine, LateLine, WorkshopProgress } from '../types';

/** One printed line of the final bill. */
export type BillLine = { name: string; qty: number; amount: number; note?: string };
export type BillSection = { title: string; lines: BillLine[] };

/**
 * The final bill of a job as a document: who it is from and to, the vehicle, what was agreed, what was approved on top, what was added at handover
 * (with how the owner agreed), labour and parts totals, and the warranty. It is turned into a PDF (billHtml) or text (billText) to share with the customer.
 */
export type BillDocument = {
  number: string;
  issuedAt: number;
  garage: { name: string; phone?: string; address?: string };
  customer: { name: string; phone?: string };
  vehicle: string;
  title: string;
  sections: BillSection[];
  labour: number;
  parts: number;
  total: number;
  warrantyMonths?: number;
  /** Anything to say at the foot (balance due, the part-payment promise). */
  footnotes: string[];
};

const lineOf = (l: DiagnosisLine): BillLine => ({ name: l.name, qty: l.qty, amount: l.price });

export const buildBill = (input: {
  id: string;
  issuedAt: number;
  garage: BillDocument['garage'];
  customer: BillDocument['customer'];
  vehicle: string;
  title: string;
  agreedPrice: number;
  progress: WorkshopProgress;
  /** Parts actually paid for (ordered parts), when known. */
  partsCost?: number;
  warrantyMonths?: number;
}): BillDocument => {
  const p = input.progress;
  const base = workshopBill(input.agreedPrice, p, input.partsCost);
  const late: LateLine[] = p.handover?.lateLines ?? [];
  const totals = p.handover ? { labour: p.handover.bill.labour, parts: p.handover.bill.parts, total: p.handover.bill.total } : billWithLate(base, late);
  const approved = approvedLines(p);
  const sections: BillSection[] = [{ title: 'එකඟ වූ වැඩ', lines: [{ name: input.title, qty: 1, amount: input.agreedPrice }] }];
  if (approved.length) sections.push({ title: 'අනුමත කළ අමතර වැඩ සහ කොටස්', lines: approved.map(lineOf) });
  if (late.length) sections.push({ title: 'භාරදීමේදී එකතු කළ (අයිතිකරු එකඟ වූ ආකාරය සමඟ)', lines: late.map((l) => ({ ...lineOf(l), note: LATE_VIA_LABEL[l.via] })) });
  const footnotes: string[] = [];
  const pay = p.payment;
  if (pay && pay.balance > 0) footnotes.push(`ගෙවූ මුදල ${lkr(pay.received)} · ඉතිරිය ${lkr(pay.balance)}`);
  return {
    number: `INV-${input.id.replace(/[^a-zA-Z0-9]/g, '').slice(-8).toUpperCase()}`,
    issuedAt: input.issuedAt,
    garage: input.garage,
    customer: input.customer,
    vehicle: input.vehicle,
    title: input.title,
    sections,
    labour: totals.labour,
    parts: totals.parts,
    total: totals.total,
    warrantyMonths: input.warrantyMonths,
    footnotes,
  };
};

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const lkr = (n: number) => `LKR ${Math.round(n).toLocaleString('en-US')}`;
const day = (t: number) => new Date(t).toISOString().slice(0, 10);

/** The bill as a printable HTML page (turned into a PDF by the print dialog or expo-print). */
export const billHtml = (b: BillDocument): string => `<!doctype html><html><head><meta charset="utf-8"><title>${esc(b.number)}</title>
<style>
body{font-family:'Noto Sans Sinhala','Iskoola Pota',Arial,sans-serif;color:#1f2937;margin:32px;font-size:14px}
h1{font-size:22px;margin:0}.muted{color:#6b7280;font-size:12px}.row{display:flex;justify-content:space-between;gap:16px}
table{width:100%;border-collapse:collapse;margin-top:6px}td,th{padding:7px 4px;border-bottom:1px solid #e5e7eb;text-align:left;font-size:13px}
th{color:#6b7280;font-weight:600}td.r,th.r{text-align:right}h2{font-size:14px;margin:20px 0 0}
.tot td{border:0;font-weight:700}.grand td{font-size:16px;border-top:2px solid #111827}
.note{color:#6b7280;font-size:11px}</style></head><body>
<div class="row"><div><h1>${esc(b.garage.name)}</h1><div class="muted">${esc(b.garage.address ?? '')}${b.garage.phone ? ' · ' + esc(b.garage.phone) : ''}</div></div>
<div style="text-align:right"><div style="font-size:18px;font-weight:700">බිල්පත</div><div class="muted">${esc(b.number)} · ${day(b.issuedAt)}</div></div></div>
<div class="row" style="margin-top:18px"><div><div class="muted">පාරිභෝගිකයා</div>${esc(b.customer.name)}${b.customer.phone ? '<br>' + esc(b.customer.phone) : ''}</div>
<div style="text-align:right"><div class="muted">වාහනය</div>${esc(b.vehicle)}</div></div>
${b.sections
  .map(
    (s) => `<h2>${esc(s.title)}</h2><table><tr><th>විස්තරය</th><th class="r">ප්‍රමාණය</th><th class="r">මුදල</th></tr>${s.lines
      .map((l) => `<tr><td>${esc(l.name)}${l.note ? `<div class="note">${esc(l.note)}</div>` : ''}</td><td class="r">${l.qty}</td><td class="r">${lkr(l.amount)}</td></tr>`)
      .join('')}</table>`
  )
  .join('')}
<table style="margin-top:18px"><tr class="tot"><td>වැඩ ගාස්තුව</td><td class="r">${lkr(b.labour)}</td></tr><tr class="tot"><td>කොටස්</td><td class="r">${lkr(b.parts)}</td></tr>
<tr class="tot grand"><td>මුළු මුදල</td><td class="r">${lkr(b.total)}</td></tr></table>
${b.warrantyMonths ? `<p class="muted">🛡️ මාස ${b.warrantyMonths} වගකීමක් ඇත.</p>` : ''}
${b.footnotes.map((f) => `<p class="muted">${esc(f)}</p>`).join('')}
<p class="note">OnGarage app එක හරහා සකස් කළ බිල්පතකි.</p></body></html>`;

/** The same bill as plain text (the fallback when a PDF can't be made). */
export const billText = (b: BillDocument): string =>
  [
    `${b.garage.name} · බිල්පත ${b.number} · ${day(b.issuedAt)}`,
    `${b.customer.name} · ${b.vehicle}`,
    ...b.sections.flatMap((s) => [`— ${s.title}`, ...s.lines.map((l) => `  ${l.name}${l.qty > 1 ? ` ×${l.qty}` : ''}: ${lkr(l.amount)}${l.note ? ` (${l.note})` : ''}`)]),
    `වැඩ ගාස්තුව ${lkr(b.labour)} · කොටස් ${lkr(b.parts)}`,
    `මුළු මුදල ${lkr(b.total)}`,
    ...(b.warrantyMonths ? [`මාස ${b.warrantyMonths} වගකීමක්`] : []),
    ...b.footnotes,
  ].join('\n');
