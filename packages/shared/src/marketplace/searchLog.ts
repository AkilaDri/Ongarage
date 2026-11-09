import { normaliseSearch, searchServices } from './serviceSearch';

// What owners search for, and what they tap afterwards. The words that find nothing, and the service the owner then picks, teach the
// search new words (learnedFrom → setLearnedTerms). Only the typed text and the picked service are kept: no location, no identity.

/** One search the owner made: what they typed, how many results it had, and the service they tapped (if any). */
export interface SearchEvent {
  query: string;
  hits: number;
  picked?: { categoryId: string; sub?: string; label: string };
  at: number;
}

/** How many events are kept on the device; the oldest go first. */
export const SEARCH_LOG_LIMIT = 500;

/** A phrase must lead to the same pick this many times before the search learns it. */
export const LEARN_MIN_COUNT = 2;

/** The log with one more search in it, the oldest dropped past the limit. Blank searches are not kept. */
export const recordSearch = (events: SearchEvent[], event: SearchEvent): SearchEvent[] => {
  if (!normaliseSearch(event.query)) return events;
  return [...events, event].slice(-SEARCH_LOG_LIMIT);
};

export interface SearchSummary {
  total: number;
  /** Searches that found nothing, the most typed first. */
  emptyQueries: { query: string; count: number }[];
  /** Single words from the empty searches that no service word matches: the vocabulary the search is missing. */
  unknownWords: { word: string; count: number }[];
  /** Pick counts by service, so the team sees what owners actually go for. */
  picks: { label: string; count: number }[];
}

const top = <T>(counts: Map<string, number>, make: (key: string, count: number) => T, limit = 20): T[] =>
  [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit).map(([k, n]) => make(k, n));

/** What the log says: the empty searches, the words the search does not know, and what people pick. */
export const summariseSearches = (events: SearchEvent[]): SearchSummary => {
  const empty = new Map<string, number>();
  const unknown = new Map<string, number>();
  const picks = new Map<string, number>();
  for (const e of events) {
    if (e.picked) picks.set(e.picked.label, (picks.get(e.picked.label) ?? 0) + 1);
    if (e.hits > 0) continue;
    const q = normaliseSearch(e.query);
    empty.set(q, (empty.get(q) ?? 0) + 1);
    for (const w of q.split(' ')) {
      if (w.length >= 3 && !searchServices(w, 1).length) unknown.set(w, (unknown.get(w) ?? 0) + 1);
    }
  }
  return {
    total: events.length,
    emptyQueries: top(empty, (query, count) => ({ query, count })),
    unknownWords: top(unknown, (word, count) => ({ word, count })),
    picks: top(picks, (label, count) => ({ label, count })),
  };
};

/**
 * Words the search should learn: a search that found nothing and was followed by a pick of a sub-service. Its words are added to that
 * sub-service, once the same query has led to the same pick `LEARN_MIN_COUNT` times.
 */
export const learnedFrom = (events: SearchEvent[]): { categoryId: string; sub: string; words: string[] }[] => {
  const seen = new Map<string, { categoryId: string; sub: string; words: string[]; count: number }>();
  for (const e of events) {
    if (e.hits > 0 || !e.picked?.sub) continue;
    const words = normaliseSearch(e.query).split(' ').filter((w) => w.length >= 2);
    if (!words.length) continue;
    const key = `${e.picked.categoryId}|${e.picked.sub}|${words.join(' ')}`;
    const cur = seen.get(key);
    if (cur) cur.count += 1;
    else seen.set(key, { categoryId: e.picked.categoryId, sub: e.picked.sub, words, count: 1 });
  }
  return [...seen.values()].filter((x) => x.count >= LEARN_MIN_COUNT).map(({ count: _count, ...rest }) => rest);
};
