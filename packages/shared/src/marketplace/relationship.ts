/**
 * How a customer and a garage stand with each other, worked out from the jobs they finished together. The same rule serves both sides: the
 * garage reads it about a customer, the owner reads it about a garage.
 *
 *  - new: nothing finished together yet
 *  - old: they have worked together before (one job or many: no further split)
 */
export type RelationLevel = 'new' | 'old';

export const relationLevel = (finishedAt: number[]): RelationLevel => (finishedAt.length === 0 ? 'new' : 'old');

export const RELATION_LABEL: Record<RelationLevel, string> = {
  new: 'New',
  old: 'Old',
};

/** A phone number reduced to its last nine digits, so "+94 77 123 4567" and "077 123 4567" are the same number. */
export const phoneKey = (phone: string) => phone.replace(/\D/g, '').slice(-9);

/** What each standing means: written under every record. */
export const RELATION_HELP = ['New — එකට කළ රැකියා තවම නැත.', 'Old — කලින් එකට වැඩ කර ඇත.'].join('\n');

export const RELATION_PRIVACY = 'මෙහි පෙනෙන්නේ ඔබ දෙපාර්ශ්වය අතර කළ වැඩ පමණි.';
