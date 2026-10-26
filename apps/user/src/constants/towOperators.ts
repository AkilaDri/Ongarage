import type { TowOperator } from '@ongarage/shared';

/**
 * Demo tow operators around Galle until a backend supplies them. The rules (which truck a condition needs, the quote, the ranking) are in `@ongarage/shared`
 * (`marketplace/towing`). Prices are sample figures.
 */
export const TOW_OPERATORS: TowOperator[] = [
  { id: 't1', name: 'Galle Tow Express', coords: { latitude: 6.0412, longitude: 80.2121 }, phone: '077 220 1144', rating: 4.7, reviews: 86, trucks: ['Flatbed Towing', 'Emergency Transport'], baseFee: 3000, perKm: 190, recoveryFee: 2500, available: true },
  { id: 't2', name: 'Southern Recovery', coords: { latitude: 6.0701, longitude: 80.2267 }, phone: '071 880 3320', rating: 4.5, reviews: 41, trucks: ['Recovery Winch', 'Flatbed Towing'], baseFee: 2800, perKm: 210, recoveryFee: 3500, available: true },
  { id: 't3', name: 'Karapitiya Haulers', coords: { latitude: 6.0563, longitude: 80.2278 }, phone: '076 450 9921', rating: 4.2, reviews: 23, trucks: ['Flatbed Towing'], baseFee: 2500, perKm: 230, recoveryFee: 2800, available: true },
  { id: 't4', name: 'Unawatuna Lifeline Towing', coords: { latitude: 6.0152, longitude: 80.2492 }, phone: '077 612 7755', rating: 4.8, reviews: 118, trucks: ['Flatbed Towing', 'Recovery Winch', 'Emergency Transport'], baseFee: 3500, perKm: 180, recoveryFee: 3000, available: true },
  { id: 't5', name: 'Hikkaduwa Rescue', coords: { latitude: 6.1409, longitude: 80.1031 }, phone: '070 330 8812', rating: 4.4, reviews: 30, trucks: ['Emergency Transport'], baseFee: 2200, perKm: 170, recoveryFee: 2500, available: false },
];

const DAY = 24 * 60 * 60 * 1000;
export type TowReviewSeed = { id: string; name: string; rating: number; text: string; daysAgo: number; reply?: string };
const r = (id: string, name: string, rating: number, text: string, daysAgo: number, reply?: string): TowReviewSeed => ({ id, name, rating, text, daysAgo, reply });

/** What owners said about each operator (demo data until a backend keeps real reviews). */
export const TOW_REVIEWS: Record<string, TowReviewSeed[]> = {
  t1: [
    r('t1a', 'නිමල් ජයසිංහ', 5, 'විනාඩි 20කින් ආවා. වාහනයට හානියක් නැතුව ගරාජයට දැම්මා.', 4, 'ස්තූතියි! ඔබේ ගමන සුබයි.'),
    r('t1b', 'සචිනි පෙරේරා', 4, 'මිල කිව්වා වගේමයි. ටිකක් ප්‍රමාද වුණා.', 12),
  ],
  t2: [r('t2a', 'කසුන් ප්‍රනාන්දු', 5, 'මඩේ හිරවුණු වාහනය winch එකෙන් පරිස්සමට ගත්තා.', 9, 'ඕනෑම වෙලාවක අමතන්න.')],
  t3: [r('t3a', 'ඉෂාන් සිල්වා', 4, 'මිල අඩුයි, වැඩේ හොඳයි.', 6), r('t3b', 'තරිඳු පීරිස්', 3, 'කතා කරලා එන්න ටිකක් වෙලා ගියා.', 20)],
  t4: [
    r('t4a', 'දිල්ෂාන් රණසිංහ', 5, 'රෑ 11ට අනතුරකට ආවා. ඉක්මන් සහ ගෞරවයෙන් කටයුතු කළා.', 2, 'ඔබ ආරක්ෂිතයි කියා සතුටුයි.'),
    r('t4b', 'නදීශා ප්‍රනාන්දු', 5, 'ගාස්තුව කලින් කියපු එකටම ගත්තා.', 15),
    r('t4c', 'සමන් කුමාර', 4, 'හොඳ සේවාවක්.', 30),
  ],
  t5: [r('t5a', 'රුවන් ද සිල්වා', 4, 'දුර නිසා ටිකක් ප්‍රමාදයි, නමුත් හොඳයි.', 18)],
};

/** An operator's reviews as the cards the profile shows. */
export const towReviewsOf = (operatorId: string, operatorName: string) =>
  (TOW_REVIEWS[operatorId] ?? []).map((x) => ({ id: x.id, name: x.name, rating: x.rating, at: Date.now() - x.daysAgo * DAY, text: x.text, meta: '✓ Tow request එකක් අවසන් කළා', reply: x.reply ? { by: operatorName, text: x.reply, at: Date.now() - (x.daysAgo - 0.5) * DAY } : undefined }));
