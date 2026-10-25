/**
 * The order the service categories are shown in: the ones most people need come first. Until there is real data from a back end, the order is
 * a sensible default for Sri Lanka (routine service, tyres, brakes and suspension, batteries and A/C are needed by nearly every vehicle; hybrid,
 * tuning and charging by few). An owner's own bookings and jobs then move the categories they use most to the front.
 */
export const DEFAULT_POPULARITY: string[] = ['14', '6', '7', '11', '4', '9', '8', '2', '5', '1', '3', '12', '10', '15', '16', '13'];

/** Categories ordered by how many times each was used (most first); ties, and categories never used, keep the default order. */
export const rankCategories = <T extends { id: string }>(items: T[], usage: Record<string, number> = {}): T[] => {
  const place = (id: string) => {
    const i = DEFAULT_POPULARITY.indexOf(id);
    return i < 0 ? DEFAULT_POPULARITY.length : i;
  };
  return items
    .map((item, index) => ({ item, index }))
    .sort((a, b) => (usage[b.item.id] ?? 0) - (usage[a.item.id] ?? 0) || place(a.item.id) - place(b.item.id) || a.index - b.index)
    .map((x) => x.item);
};

/** How many times each category appears in a list of things that carry a category id (bookings, posted jobs, ...). */
export const countByCategory = (list: { categoryId?: string }[]): Record<string, number> => {
  const out: Record<string, number> = {};
  for (const x of list) if (x.categoryId) out[x.categoryId] = (out[x.categoryId] ?? 0) + 1;
  return out;
};

/**
 * The specific jobs owners ask for most, shown to them as suggestions (not whole categories): one touch opens the garages for that category with
 * that sub-service already picked. Every `sub` is one of its category's sub-services. The list is longer than what fits on screen: the suggestions
 * on Home move along it from time to time (see suggestedNow), most-asked first.
 */
export const POPULAR_SERVICES: { categoryId: string; sub: string; icon: string }[] = [
  { categoryId: '14', sub: 'Oil Change', icon: '🛢️' },
  { categoryId: '14', sub: 'Full Service', icon: '🛠️' },
  { categoryId: '6', sub: 'Wheel Alignment', icon: '🛞' },
  { categoryId: '6', sub: 'Wheel Balancing', icon: '⚖️' },
  { categoryId: '9', sub: 'Full Body Wash', icon: '🚿' },
  { categoryId: '7', sub: 'Brake Pads', icon: '🛑' },
  { categoryId: '11', sub: 'Battery Replacement', icon: '🔋' },
  { categoryId: '4', sub: 'AC Gas Refill', icon: '❄' },
  { categoryId: '6', sub: 'Tyre Replacement', icon: '🛞' },
  { categoryId: '6', sub: 'Puncture Repair', icon: '🔧' },
  { categoryId: '7', sub: 'Shock Absorbers', icon: '🚗' },
  { categoryId: '14', sub: 'Air Filter', icon: '🌬️' },
  { categoryId: '8', sub: 'Dent Removal', icon: '🔨' },
  { categoryId: '8', sub: 'Scratch Repair', icon: '🎨' },
  { categoryId: '9', sub: 'Interior Detailing', icon: '✨' },
  { categoryId: '4', sub: 'Compressor Repair', icon: '❄' },
  { categoryId: '5', sub: 'OBD2 Full Scan', icon: '💻' },
  { categoryId: '2', sub: 'Alternator', icon: '⚡' },
  { categoryId: '1', sub: 'Clutch Replacement', icon: '⚙️' },
  { categoryId: '1', sub: 'Timing Belt', icon: '⛓️' },
];

/** How long one set of suggestions stays before the next set comes (ms). */
export const SUGGESTION_ROTATE_MS = 4000;

/**
 * The suggestions to show at a moment: `size` of them, starting where the clock puts them. Each `SUGGESTION_ROTATE_MS` the window moves on by
 * `size` (wrapping round to the start), so over a minute or so every suggested job gets its turn, and the same moment always gives the same set.
 */
export const suggestedNow = <T,>(pool: T[], size: number, now: number = Date.now()): T[] => {
  if (!pool.length || size <= 0) return [];
  const take = Math.min(size, pool.length);
  const start = ((Math.floor(now / SUGGESTION_ROTATE_MS) * take) % pool.length + pool.length) % pool.length;
  return Array.from({ length: take }, (_, i) => pool[(start + i) % pool.length]);
};
