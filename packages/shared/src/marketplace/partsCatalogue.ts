import { PART_TAXONOMY_GROUPS, PART_TAXONOMY, VEHICLE_MAKES } from '../constants/partsTaxonomy';
import type { PartBrief, CatalogueMatch, CatalogueQuery, CatalogueVehicleTag, PartTaxonomyGroup, PartTaxonomyPart, PartType, ShopCatalogue, ShopCatalogueEntry, ShopReplyKind, VehicleKind } from '../types';

// OnMart without a live stock: a parts shop says which kinds of part it sells and for which vehicles (a make, optionally a model
// and a chassis code), with the brands and part types it deals in. A buyer's search (a part and the vehicle it is for) is matched
// against that, the best matches are asked, and each answers "have it", "don't have it" or "I'll check", optionally with a price
// and a neighbour shop to try. Nothing here needs the shop to count what is on its shelves.

// ---------- Taxonomy ----------

export const groupInfo = (groupId: string): PartTaxonomyGroup | undefined => PART_TAXONOMY_GROUPS.find((g) => g.id === groupId);
export const partInfo = (partId: string): PartTaxonomyPart | undefined => PART_TAXONOMY.find((p) => p.id === partId);
export const partsInGroup = (groupId: string) => PART_TAXONOMY.filter((p) => p.groupId === groupId);

/** The service category (SERVICE_CATEGORIES id) a part or a whole group belongs to: what the older category filters use. */
export const serviceCategoryOf = (partId?: string, groupId?: string) => groupInfo(groupId ?? partInfo(partId ?? '')?.groupId ?? '')?.serviceCategoryId;

const clean = (s: string) => s.toLowerCase().replace(/[^a-z0-9඀-෿ ]/g, ' ').replace(/\s+/g, ' ').trim();

/**
 * What a buyer typed (English, Singlish or Sinhala) → the part kinds it may mean, best first. A word match on the part's own
 * words wins over a match on its name; a query that is only a group name gives that group's parts.
 */
export const findParts = (query: string): PartTaxonomyPart[] => {
  const q = clean(query);
  if (!q) return [];
  const scored = PART_TAXONOMY.map((p) => {
    const words = p.words.map(clean);
    let score = 0;
    if (words.some((w) => w === q)) score = 100;
    else if (words.some((w) => w.length >= 3 && (q.includes(w) || w.includes(q)))) score = 70;
    else if (clean(p.name).includes(q) || clean(p.si).includes(q)) score = 50;
    else if (q.split(' ').some((t) => t.length >= 4 && (words.some((w) => w.includes(t)) || clean(p.name).includes(t)))) score = 30;
    return { p, score };
  })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);
  return scored.map((x) => x.p);
};

// ---------- Vehicles ----------

/** "benz", "Merc" and "Mercedes Benz" all mean "Mercedes-Benz"; unknown makes come back tidied, so a shop can add its own. */
export const normaliseMake = (text: string): string => {
  const t = clean(text);
  const hit = VEHICLE_MAKES.find((m) => clean(m.make) === t || (m.aliases ?? []).some((a) => clean(a) === t));
  if (hit) return hit.make;
  return text.trim().replace(/\b\w/g, (c) => c.toUpperCase());
};

export const makeInfo = (make: string) => VEHICLE_MAKES.find((m) => m.make === normaliseMake(make));
export const makesOfKind = (kind: VehicleKind) => VEHICLE_MAKES.filter((m) => m.kind === kind);
/** The models (and their codes) of a make, for the tag pickers. */
export const modelsOf = (make: string) => makeInfo(make)?.models ?? [];

/** The model code at the front of a chassis number ("NZE141-9012345" → "NZE141"), or undefined. */
export const modelCodeFromChassis = (chassisNo?: string) => {
  const m = (chassisNo ?? '').toUpperCase().trim().match(/^([A-Z]{1,5}\d{1,3}[A-Z]?)\s*[-\s]/);
  return m?.[1];
};

/** The make named in a vehicle's name ("Toyota Premio" → "Toyota"), or undefined. */
export const makeFromName = (name?: string): string | undefined => {
  const t = clean(name ?? '');
  if (!t) return undefined;
  const tokens = t.split(' ');
  return VEHICLE_MAKES.find((m) => [m.make, ...(m.aliases ?? [])].some((a) => tokens.includes(clean(a)) || t.startsWith(clean(a))))?.make;
};

/**
 * What a buyer's brief asks the catalogues: the part kind (found from the name the buyer wrote, or the group of its service
 * category), the vehicle (make, model, chassis code, year) and the part type.
 */
export const queryFromBrief = (brief: Pick<PartBrief, 'name' | 'partType' | 'categoryId' | 'vehicle'> & { partId?: string }): CatalogueQuery => {
  const v = brief.vehicle;
  const part = brief.partId ?? findParts(brief.name)[0]?.id;
  return {
    partId: part,
    vehicle: v ? { make: v.make ? normaliseMake(v.make) : makeFromName(v.name), model: v.model, code: modelCodeFromChassis(v.chassisNo), year: v.year } : undefined,
    partType: brief.partType,
  };
};

// ---------- Matching ----------

/** How closely a shop's tags fit the vehicle: the code, the model, the make, or "for every vehicle" (the weakest). */
export type CoverageTier = CatalogueMatch['tier'];
export const TIER_SCORE: Record<CoverageTier, number> = { exact: 100, model: 80, make: 60, any: 30 };
export const TIER_LABEL: Record<CoverageTier, string> = {
  exact: 'ඔබේ වාහන කේතයටම ගැළපෙන ටැග් ඇත',
  model: 'ඔබේ වාහන මාදිලියට ගැළපෙන ටැග් ඇත',
  make: 'ඔබේ වාහන නිෂ්පාදකයාට ගැළපෙන ටැග් ඇත',
  any: 'සියලු වාහන සඳහා කොටස් විකුණයි',
};

const sameModel = (a?: string, b?: string) => !!a && !!b && clean(a) === clean(b);

/** The tier a vehicle tag gives a vehicle, or null when it does not cover it. */
const tagTier = (tag: CatalogueVehicleTag, v: CatalogueQuery['vehicle']): CoverageTier | null => {
  if (!v?.make) return null;
  if (normaliseMake(tag.make) !== normaliseMake(v.make)) return null;
  const hasModels = !!tag.models?.length;
  const hasCodes = !!tag.codes?.length;
  if (hasCodes && v.code && tag.codes!.some((c) => c.toUpperCase() === v.code!.toUpperCase())) return 'exact';
  if (hasModels && v.model && tag.models!.some((m) => sameModel(m, v.model))) return hasCodes && v.code ? null : 'model';
  // A make tag with no narrowing covers the whole make.
  if (!hasModels && !hasCodes) return 'make';
  // Narrowed to models or codes that this vehicle is not.
  return null;
};

/** Whether an entry is for the part (or the part's group) being looked for. */
const entryScope = (entry: ShopCatalogueEntry, q: CatalogueQuery): CatalogueMatch['scope'] | null => {
  if (entry.partId) return q.partId && entry.partId === q.partId ? 'part' : null;
  const groupId = q.groupId ?? (q.partId ? partInfo(q.partId)?.groupId : undefined);
  return groupId && entry.groupId === groupId ? 'group' : null;
};

/** The best way one entry covers a query, or null. */
export const entryMatch = (entry: ShopCatalogueEntry, q: CatalogueQuery): CatalogueMatch | null => {
  const scope = entryScope(entry, q);
  if (!scope) return null;
  if (q.partType && q.partType !== 'GarageChoice' && entry.partTypes.length && !entry.partTypes.includes(q.partType)) return null;
  // No vehicle asked about, or no vehicle tags on the entry (sells for any vehicle).
  if (!q.vehicle?.make) return { tier: 'any', scope, entry };
  if (!entry.vehicles.length) return { tier: 'any', scope, entry };
  let best: CoverageTier | null = null;
  for (const tag of entry.vehicles) {
    const t = tagTier(tag, q.vehicle);
    if (t && (!best || TIER_SCORE[t] > TIER_SCORE[best])) best = t;
  }
  return best ? { tier: best, scope, entry } : null;
};

/** The best match a shop's whole catalogue gives a query (a part-specific entry beats a whole-group one), or null: it does not sell this. */
export const shopCovers = (catalogue: ShopCatalogue | undefined, q: CatalogueQuery): CatalogueMatch | null => {
  let best: CatalogueMatch | null = null;
  for (const entry of catalogue ?? []) {
    const m = entryMatch(entry, q);
    if (!m) continue;
    const score = (x: CatalogueMatch) => TIER_SCORE[x.tier] * 2 + (x.scope === 'part' ? 1 : 0) + (q.brand && x.entry.brands.some((b) => clean(b) === clean(q.brand!)) ? 0.5 : 0);
    if (!best || score(m) > score(best)) best = m;
  }
  return best;
};

/** A number that orders matches (higher is closer), for ranking. */
export const matchScore = (m: CatalogueMatch) => TIER_SCORE[m.tier] + (m.scope === 'part' ? 5 : 0);

export type MatchedShop<T> = { shop: T; match: CatalogueMatch };

/**
 * The shops (with a catalogue) that sell what is asked for, closest fit first, then nearest. Shops without a catalogue are not
 * matched here (a shop with live stock is still found by its stock).
 */
export const matchingShops = <T extends { catalogue?: ShopCatalogue; distanceKm?: number }>(shops: T[], q: CatalogueQuery): MatchedShop<T>[] =>
  shops
    .map((shop) => ({ shop, match: shopCovers(shop.catalogue, q) }))
    .filter((x): x is MatchedShop<T> => !!x.match)
    .sort((a, b) => matchScore(b.match) - matchScore(a.match) || (a.shop.distanceKm ?? 0) - (b.shop.distanceKm ?? 0));

/** How many shops one request goes to at once, and how long they have to answer (minutes). */
export const BROADCAST_LIMIT = 5;
export const ANSWER_WINDOW_MIN = 30;

/** The shops a request is sent to: the closest fits, at most BROADCAST_LIMIT; asking again goes to the next ones (`skip`). */
export const broadcastTargets = <T>(matches: MatchedShop<T>[], skip: Set<unknown> = new Set(), limit = BROADCAST_LIMIT) =>
  matches.filter((m) => !skip.has(m.shop)).slice(0, limit);

/**
 * Neighbour shops a shop can point a buyer to when it does not have the part: shops that cover the same query, not itself and not
 * the ones already asked, nearest first.
 */
export const suggestNeighbours = <T extends { id: string; catalogue?: ShopCatalogue; distanceKm?: number }>(shops: T[], q: CatalogueQuery, excludeIds: string[], limit = 3): T[] =>
  matchingShops(shops.filter((s) => !excludeIds.includes(s.id)), q)
    .sort((a, b) => (a.shop.distanceKm ?? 0) - (b.shop.distanceKm ?? 0) || matchScore(b.match) - matchScore(a.match))
    .slice(0, limit)
    .map((x) => x.shop);

// ---------- Replies ----------

export const REPLY_LABEL: Record<ShopReplyKind, string> = { have: 'තියෙනවා', none: 'නැහැ', check: 'පරීක්ෂා කර දන්වමි' };

/** A reply of "have it" is the only one that may carry a price and lead to a reservation. */
export const replyCanReserve = (kind: ShopReplyKind) => kind === 'have';

// ---------- A shop's catalogue ----------

export const MAX_MAKES_PER_ENTRY = 12;
export const MIN_CATALOGUE_ENTRIES = 1;

/** Why a catalogue is not ready to save (empty = fine): the shop must sell something, and tags must not be everything at once. */
export const validateCatalogue = (catalogue: ShopCatalogue): string[] => {
  const problems: string[] = [];
  if (catalogue.length < MIN_CATALOGUE_ENTRIES) problems.push('අවම වශයෙන් කොටස් ප්‍රවර්ගයක් තෝරන්න.');
  const seen = new Set<string>();
  for (const e of catalogue) {
    if (!groupInfo(e.groupId)) problems.push(`නොදන්නා ප්‍රවර්ගයක්: ${e.groupId}`);
    if (e.partId && !partInfo(e.partId)) problems.push(`නොදන්නා කොටසක්: ${e.partId}`);
    if (e.vehicles.length > MAX_MAKES_PER_ENTRY) problems.push(`${e.partId ? partInfo(e.partId)?.name : groupInfo(e.groupId)?.name}: වාහන නිෂ්පාදකයන් ${MAX_MAKES_PER_ENTRY}ට වඩා ටැග් කළ නොහැක (සියල්ලටම නම් ටැග් නොදමා තබන්න).`);
    const key = `${e.groupId}:${e.partId ?? '*'}`;
    if (seen.has(key)) problems.push(`එකම කොටස දෙවරක් ඇත: ${e.partId ? partInfo(e.partId)?.name : groupInfo(e.groupId)?.name}`);
    seen.add(key);
  }
  return problems;
};

/** Adds an entry, or replaces the one for the same part (or group). */
export const upsertEntry = (catalogue: ShopCatalogue, entry: ShopCatalogueEntry): ShopCatalogue => {
  const same = (e: ShopCatalogueEntry) => e.groupId === entry.groupId && (e.partId ?? '*') === (entry.partId ?? '*');
  return catalogue.some(same) ? catalogue.map((e) => (same(e) ? entry : e)) : [...catalogue, entry];
};

export const removeEntry = (catalogue: ShopCatalogue, entryId: string): ShopCatalogue => catalogue.filter((e) => e.id !== entryId);

/** One line a buyer reads about a shop: "Headlights — Honda, Toyota, Mazda". */
export const entryLabel = (entry: ShopCatalogueEntry) => {
  const what = entry.partId ? partInfo(entry.partId)?.name : `${groupInfo(entry.groupId)?.name} (සියල්ල)`;
  const who = entry.vehicles.length ? entry.vehicles.map((v) => (v.models?.length ? `${v.make} ${v.models.join('/')}` : v.make)).join(', ') : 'සියලු වාහන';
  return `${what} — ${who}`;
};

/** The few lines that sum up a shop's catalogue for its profile. */
export const catalogueSummary = (catalogue: ShopCatalogue | undefined, max = 4) => {
  const lines = (catalogue ?? []).map(entryLabel);
  return lines.length > max ? [...lines.slice(0, max), `+ තවත් ${lines.length - max}`] : lines;
};

/** All the makes a catalogue is tagged for (for a listing's chips). */
export const cataloguesMakes = (catalogue: ShopCatalogue | undefined) => [...new Set((catalogue ?? []).flatMap((e) => e.vehicles.map((v) => normaliseMake(v.make))))];

// ---------- Starting points for a shop's first set-up ----------

const entry = (id: string, groupId: string, vehicles: CatalogueVehicleTag[], extra: Partial<ShopCatalogueEntry> = {}): ShopCatalogueEntry => ({
  id,
  groupId,
  vehicles,
  brands: [],
  partTypes: ['Genuine', 'OEM', 'Recon'],
  addedAt: 0,
  ...extra,
});

const japanese: CatalogueVehicleTag[] = ['Toyota', 'Honda', 'Nissan', 'Suzuki', 'Mitsubishi', 'Mazda'].map((make) => ({ make }));
const european: CatalogueVehicleTag[] = ['Mercedes-Benz', 'BMW', 'Audi', 'Volkswagen'].map((make) => ({ make }));

/** A template pre-fills a shop's catalogue so it only has to adjust it, not build it. */
export const SHOP_TEMPLATES: { id: string; name: string; hint: string; build: () => ShopCatalogue }[] = [
  {
    id: 'japanese',
    name: 'ජපන් කාර් කොටස්',
    hint: 'Toyota, Honda, Nissan, Suzuki, Mitsubishi, Mazda සඳහා එන්ජින්, බ්‍රේක්, සස්පෙන්ෂන්, ආලෝක, පෙරහන්',
    build: () => ['engine', 'fluids', 'brakes', 'suspension', 'lighting', 'electrical', 'cooling', 'body'].map((g) => entry(`t-${g}`, g, japanese)),
  },
  {
    id: 'european',
    name: 'යුරෝපීය කාර් කොටස්',
    hint: 'Benz, BMW, Audi, Volkswagen සඳහා කොටස්',
    build: () => ['engine', 'fluids', 'brakes', 'suspension', 'lighting', 'electrical', 'cooling'].map((g) => entry(`t-${g}`, g, european, { partTypes: ['Genuine', 'OEM'] })),
  },
  {
    id: 'tyres-batteries',
    name: 'ටයර් සහ බැටරි',
    hint: 'ටයර්, රෝද, මෝටර් රථ බැටරි',
    build: () => [entry('t-tyres', 'tyres', []), entry('t-battery', 'battery', [])],
  },
  {
    id: 'auto-electrical',
    name: 'වාහන විදුලි සහ ආලෝක',
    hint: 'ඇල්ටර්නේටර්, ස්ටාටර්, ලයිට්, සෙන්සර්',
    build: () => [entry('t-electrical', 'electrical', japanese), entry('t-lighting', 'lighting', japanese)],
  },
  {
    id: 'body-glass',
    name: 'බඩි සහ වීදුරු කොටස්',
    hint: 'බම්පර්, ෆෙන්ඩර්, වින්ඩ්ස්ක්‍රීන්, මිරර්',
    build: () => [entry('t-body', 'body', japanese), entry('t-glass', 'glass', japanese)],
  },
  {
    id: 'motorbike',
    name: 'යතුරුපැදි කොටස්',
    hint: 'Honda, TVS, Yamaha, Hero, Bajaj යතුරුපැදි කොටස්',
    build: () => [entry('t-bike', 'motorbike', ['Honda Motorcycles', 'TVS', 'Yamaha', 'Hero', 'Bajaj'].map((make) => ({ make })), { partTypes: ['Genuine', 'OEM'] })],
  },
  {
    id: 'threewheeler',
    name: 'ත්‍රීරෝද කොටස්',
    hint: 'Bajaj ත්‍රීරෝද කොටස්',
    build: () => [entry('t-tw', 'threewheeler', [{ make: 'Bajaj' }])],
  },
];

export const templateById = (id: string) => SHOP_TEMPLATES.find((t) => t.id === id);

/** Merges several templates into one catalogue (a part kind in two of them keeps the first). */
export const catalogueFromTemplates = (ids: string[]): ShopCatalogue => {
  let out: ShopCatalogue = [];
  for (const id of ids) for (const e of templateById(id)?.build() ?? []) if (!out.some((x) => x.groupId === e.groupId && (x.partId ?? '*') === (e.partId ?? '*'))) out = [...out, e];
  return out;
};

/** The PartType values a shop deals in across its catalogue (what the older `types` filter reads). */
export const catalogueTypes = (catalogue: ShopCatalogue | undefined): Exclude<PartType, 'GarageChoice'>[] => [...new Set((catalogue ?? []).flatMap((e) => e.partTypes))];
/** The service categories its catalogue reaches (what the older `categories` filter reads). */
export const catalogueCategories = (catalogue: ShopCatalogue | undefined): string[] => [...new Set((catalogue ?? []).map((e) => serviceCategoryOf(e.partId, e.groupId)).filter((c): c is string => !!c))];
