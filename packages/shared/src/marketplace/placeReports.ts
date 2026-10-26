import type { ChargerState, FuelName, FuelStock, PlugType } from './places';

/**
 * What owners tell each other about a station or a charger: whether a fuel is in stock, whether a charger works, how long the queue is, and what they thought of the
 * place. The rules (who may report, how long a report counts, how reports add up) are here so every app reads them the same way.
 *
 * A report is only as good as it is fresh and nearby: it can be made only from near the place, only once an hour per place, and it expires (fuel stock after two hours).
 * What the station's own staff confirm counts above what the crowd says. None of this ever depends on payment.
 */
export type PlaceReportKind = 'stock' | 'charger' | 'queue';
export type QueueLevel = 'none' | 'short' | 'long';

export type PlaceReport = {
  id: string;
  placeId: string;
  userId: string;
  kind: PlaceReportKind;
  at: number;
  /** stock: which fuel and how much is left. */
  fuel?: FuelName;
  stock?: FuelStock;
  /** charger: which plug and whether it works. */
  plug?: PlugType;
  working?: boolean;
  /** queue: how long. */
  queue?: QueueLevel;
  /** Said by the station's own staff (shown above the crowd). */
  byOwner?: boolean;
};

export type PlaceReview = { id: string; placeId: string; userId: string; name: string; rating: number; text?: string; at: number };

const MIN = 60 * 1000;
const HOUR = 60 * MIN;
/** A report can only be made from within this distance (metres) of the place. */
export const REPORT_RADIUS_M = 500;
/** One report per person per place per this long. */
export const REPORT_COOLDOWN_MS = HOUR;
/** How long a report still counts. */
export const REPORT_TTL_MS: Record<PlaceReportKind, number> = { stock: 2 * HOUR, charger: 4 * HOUR, queue: HOUR };
/** How long the station's own confirmation stays above the crowd. */
export const OWNER_CONFIRM_TTL_MS = 6 * HOUR;

export type CanReport = { ok: true } | { ok: false; reason: 'far' | 'cooldown'; /** far: how far away (m); cooldown: minutes left. */ value: number };

/** May this person report on this place now? `distanceM`: how far they are from it; `lastAt`: when they last reported on it. */
export const canReport = (distanceM: number, lastAt: number | undefined, now: number): CanReport => {
  if (distanceM > REPORT_RADIUS_M) return { ok: false, reason: 'far', value: Math.round(distanceM) };
  if (lastAt !== undefined && now - lastAt < REPORT_COOLDOWN_MS) return { ok: false, reason: 'cooldown', value: Math.ceil((REPORT_COOLDOWN_MS - (now - lastAt)) / MIN) };
  return { ok: true };
};

export const isFresh = (r: PlaceReport, now: number) => now - r.at < (r.byOwner ? OWNER_CONFIRM_TTL_MS : REPORT_TTL_MS[r.kind]);

export type CrowdValue<T> = { value: T; /** How many reports agree (the station's own confirmation counts as one). */ count: number; latestAt: number; byOwner: boolean };

/** The most common value among reports (a tie goes to the more recent one). */
const majority = <T,>(reports: { v: T; at: number }[]): { v: T; count: number; latestAt: number } | null => {
  if (!reports.length) return null;
  const tally = new Map<T, { count: number; latestAt: number }>();
  for (const r of reports) {
    const t = tally.get(r.v) ?? { count: 0, latestAt: 0 };
    tally.set(r.v, { count: t.count + 1, latestAt: Math.max(t.latestAt, r.at) });
  }
  let best: [T, { count: number; latestAt: number }] | null = null;
  for (const e of tally) if (!best || e[1].count > best[1].count || (e[1].count === best[1].count && e[1].latestAt > best[1].latestAt)) best = e;
  return best ? { v: best[0], count: best[1].count, latestAt: best[1].latestAt } : null;
};

/** What the reports say about a fuel's stock at a place now: the station's own latest word if it is fresh, else the crowd's majority. */
export const crowdStock = (reports: PlaceReport[], placeId: string, fuel: FuelName, now: number): CrowdValue<FuelStock> | null => {
  const mine = reports.filter((r) => r.placeId === placeId && r.kind === 'stock' && r.fuel === fuel && r.stock && isFresh(r, now));
  const owner = mine.filter((r) => r.byOwner).sort((a, b) => b.at - a.at)[0];
  if (owner) return { value: owner.stock!, count: 1, latestAt: owner.at, byOwner: true };
  const m = majority(mine.map((r) => ({ v: r.stock!, at: r.at })));
  return m ? { value: m.v, count: m.count, latestAt: m.latestAt, byOwner: false } : null;
};

/** Whether the reports say a charger works: the station's word first, else the majority. */
export const crowdCharger = (reports: PlaceReport[], placeId: string, plug: PlugType, now: number): CrowdValue<boolean> | null => {
  const mine = reports.filter((r) => r.placeId === placeId && r.kind === 'charger' && r.plug === plug && r.working !== undefined && isFresh(r, now));
  const owner = mine.filter((r) => r.byOwner).sort((a, b) => b.at - a.at)[0];
  if (owner) return { value: owner.working!, count: 1, latestAt: owner.at, byOwner: true };
  const m = majority(mine.map((r) => ({ v: r.working!, at: r.at })));
  return m ? { value: m.v, count: m.count, latestAt: m.latestAt, byOwner: false } : null;
};

export const crowdQueue = (reports: PlaceReport[], placeId: string, now: number): CrowdValue<QueueLevel> | null => {
  const mine = reports.filter((r) => r.placeId === placeId && r.kind === 'queue' && r.queue && isFresh(r, now));
  const m = majority(mine.map((r) => ({ v: r.queue!, at: r.at })));
  return m ? { value: m.v, count: m.count, latestAt: m.latestAt, byOwner: false } : null;
};

/** The stock to show: what fresh reports say, else the listed one. */
export const effectiveStock = (listed: FuelStock, crowd: CrowdValue<FuelStock> | null): FuelStock => crowd?.value ?? listed;
/** The state of a charger's plugs to show: a plug the crowd says is out of order shows as offline. */
export const effectiveState = (state: ChargerState, crowd: CrowdValue<boolean> | null): ChargerState => (crowd && !crowd.value ? 'offline' : state);

/** "5 min ago" as a number of minutes (at least 1). */
export const minutesAgo = (at: number, now: number) => Math.max(1, Math.round((now - at) / MIN));

export const summarizeReviews = (reviews: PlaceReview[], placeId: string): { avg: number; count: number } => {
  const mine = reviews.filter((r) => r.placeId === placeId);
  if (!mine.length) return { avg: 0, count: 0 };
  return { avg: Math.round((mine.reduce((s, r) => s + r.rating, 0) / mine.length) * 10) / 10, count: mine.length };
};

/** One review per person per place. */
export const canReview = (reviews: PlaceReview[], placeId: string, userId: string) => !reviews.some((r) => r.placeId === placeId && r.userId === userId);

/** When a fuel's stock goes from out (or low) to available, those who asked to be told are notified. */
export const stockCameBack = (before: FuelStock, after: FuelStock) => before !== 'available' && after === 'available';
