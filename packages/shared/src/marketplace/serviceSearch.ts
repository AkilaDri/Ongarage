import { SERVICE_CATEGORIES } from '../constants/categories';
import { PART_TAXONOMY, PART_TAXONOMY_GROUPS } from '../constants/partsTaxonomy';

// Finding a service from what the owner types. People type a part as a friend said it ("break pad"), in Singlish or Sinhala, with a
// spelling slip, or with a word for the part they do not know. Every word of the query has to match something in a service, a
// sub-service or a part kind (its names and the words buyers use for it). A word may be a prefix ("pad" for "pads") or a near spelling
// ("break" for "brake"). Results are ranked by how well they match; a sub-service comes above a part kind, and a part kind above a category.

export type ServiceSearchKind = 'category' | 'sub' | 'part';

export interface ServiceSearchHit {
  kind: ServiceSearchKind;
  /** The service category (SERVICE_CATEGORIES id). */
  categoryId: string;
  /** The sub-service, when the match is one. */
  sub?: string;
  /** What to show: the category name, the sub-service name, or the part kind's name. */
  label: string;
  score: number;
}

const KIND_RANK: Record<ServiceSearchKind, number> = { sub: 2, part: 1, category: 0 };

/** Lower-case, letters and digits (Latin and Sinhala) only, words separated by one space. */
export const normaliseSearch = (text: string): string => text.toLowerCase().replace(/[^a-z0-9඀-෿]+/g, ' ').trim();

const wordsOf = (text: string): string[] => normaliseSearch(text).split(' ').filter(Boolean);

/** Edit distance (insert, delete, replace). Gives up as soon as it is certainly above `max`. */
const editDistance = (a: string, b: string, max: number): number => {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    let rowMin = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
      rowMin = Math.min(rowMin, cur[j]);
    }
    if (rowMin > max) return max + 1;
    prev = cur;
  }
  return prev[b.length];
};

/** How well one query word matches one indexed word: 3 exact, 2 prefix, 1 near spelling (longer words allow more slips), 0 none. */
const wordScore = (q: string, t: string): number => {
  if (q === t) return 3;
  if (q.length >= 2 && t.startsWith(q)) return 2;
  const allowed = q.length >= 5 ? 2 : q.length >= 4 ? 1 : 0;
  return allowed && editDistance(q, t, allowed) <= allowed ? 1 : 0;
};

interface IndexEntry {
  hit: ServiceSearchHit;
  terms: string[];
}

let index: IndexEntry[] | undefined;
/** Words learned from real searches (searchLog.ts), added to the sub-service they led to. */
let learned: { categoryId: string; sub: string; words: string[] }[] = [];

/** Replaces the learned words and rebuilds the index, so the next search uses them. */
export const setLearnedTerms = (terms: { categoryId: string; sub: string; words: string[] }[]) => {
  learned = terms;
  index = undefined;
};

const buildIndex = (): IndexEntry[] => {
  const entries: IndexEntry[] = [];
  const subs = new Map<string, IndexEntry>();
  for (const c of SERVICE_CATEGORIES) {
    entries.push({ hit: { kind: 'category', categoryId: c.id, label: c.name, score: 0 }, terms: wordsOf(c.name) });
    for (const s of c.subcategories) {
      const entry: IndexEntry = { hit: { kind: 'sub', categoryId: c.id, sub: s, label: s, score: 0 }, terms: wordsOf(s) };
      subs.set(`${c.id}|${normaliseSearch(s)}`, entry);
      entries.push(entry);
    }
  }
  for (const l of learned) {
    const entry = subs.get(`${l.categoryId}|${normaliseSearch(l.sub)}`);
    if (entry) entry.terms.push(...l.words.flatMap(wordsOf));
  }
  for (const p of PART_TAXONOMY) {
    const categoryId = PART_TAXONOMY_GROUPS.find((g) => g.id === p.groupId)?.serviceCategoryId;
    if (!categoryId) continue;
    const terms = [...wordsOf(p.name), ...wordsOf(p.si), ...p.words.flatMap(wordsOf)];
    // A part kind with the same name as a sub-service is that sub-service: it finds the sub by the words buyers use for it.
    const sub = subs.get(`${categoryId}|${normaliseSearch(p.name)}`);
    if (sub) {
      sub.terms.push(...terms);
      continue;
    }
    entries.push({ hit: { kind: 'part', categoryId, label: p.name, score: 0 }, terms });
  }
  return entries;
};

const keyOf = (h: ServiceSearchHit) => `${h.categoryId}|${normaliseSearch(h.label)}`;

const bestFirst = (a: ServiceSearchHit, b: ServiceSearchHit) => b.score - a.score || KIND_RANK[b.kind] - KIND_RANK[a.kind];

/** The services, sub-services and part kinds a query means, best first. Empty when some word of the query matches nothing. */
export const searchServices = (query: string, limit = 12): ServiceSearchHit[] => {
  const words = wordsOf(query);
  if (!words.length) return [];
  index ??= buildIndex();
  const phrase = words.join(' ');
  const best = new Map<string, ServiceSearchHit>();
  for (const { hit, terms } of index) {
    let total = 0;
    let all = true;
    for (const w of words) {
      const score = Math.max(0, ...terms.map((t) => wordScore(w, t)));
      if (!score) {
        all = false;
        break;
      }
      total += score;
    }
    if (!all) continue;
    const scored = { ...hit, score: total + (normaliseSearch(hit.label) === phrase ? 10 : 0) };
    // The same name in one category is one result: the sub-service or part kind that matched best.
    const cur = best.get(keyOf(scored));
    if (!cur || scored.score > cur.score || (scored.score === cur.score && KIND_RANK[scored.kind] > KIND_RANK[cur.kind])) best.set(keyOf(scored), scored);
  }
  return [...best.values()].sort(bestFirst).slice(0, limit);
};

/** Suggestions for a query that found nothing: the best matches for each of its words, so "brake pad fitting" still offers the brake pads. */
export const didYouMean = (query: string, limit = 4): ServiceSearchHit[] => {
  const seen = new Map<string, ServiceSearchHit>();
  for (const w of wordsOf(query).filter((x) => x.length >= 3)) {
    for (const h of searchServices(w, 3)) {
      const cur = seen.get(keyOf(h));
      if (!cur || h.score > cur.score) seen.set(keyOf(h), h);
    }
  }
  return [...seen.values()].sort(bestFirst).slice(0, limit);
};
