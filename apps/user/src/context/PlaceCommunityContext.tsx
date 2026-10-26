import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  canReport,
  canReview,
  crowdCharger,
  crowdQueue,
  crowdStock,
  distanceKm,
  getAi,
  stockCameBack,
  SUGGEST_MIN_CONFIDENCE,
  summarizeReviews,
  type CrowdValue,
  type FuelName,
  type FuelStock,
  type LatLng,
  type PlaceReport,
  type PlaceReview,
  type PlugType,
  type QueueLevel,
} from '@ongarage/shared';
import { PLACES } from '../constants/places';
import { useNotice } from './NoticeContext';
import { useProfile } from './ProfileContext';

const ME = 'me';
const MIN = 60 * 1000;

/** What an owner can tell about a place (the place and who is telling are added). */
export type ReportInput = { placeId: string } & ({ kind: 'stock'; fuel: FuelName; stock: FuelStock } | { kind: 'charger'; plug: PlugType; working: boolean } | { kind: 'queue'; queue: QueueLevel });
export type ReportResult = { ok: true } | { ok: false; reason: 'far' | 'cooldown'; value: number };
export type AlertTopic = 'stock' | 'free';

type Api = {
  reports: PlaceReport[];
  reviews: PlaceReview[];
  stockOf: (placeId: string, fuel: FuelName) => CrowdValue<FuelStock> | null;
  chargerOf: (placeId: string, plug: PlugType) => CrowdValue<boolean> | null;
  queueOf: (placeId: string) => CrowdValue<QueueLevel> | null;
  rating: (placeId: string) => { avg: number; count: number };
  /** Report on a place from `from` (the owner's position): refused when too far away or when they reported on it within the hour. */
  report: (input: ReportInput, from: LatLng) => ReportResult;
  /** Writes a review; the text is checked first. Returns a reason when it cannot be published. */
  review: (placeId: string, rating: number, text: string) => Promise<{ ok: true } | { ok: false; reason: string }>;
  hasReviewed: (placeId: string) => boolean;
  /** "Tell me when" alerts, per place and topic ('stock': a fuel is back; 'free': a charger plug is free). Shown as notices in the app. */
  alerts: string[];
  isAlerted: (placeId: string, topic: AlertTopic) => boolean;
  toggleAlert: (placeId: string, topic: AlertTopic) => void;
};

const PlaceCommunityContext = createContext<Api | null>(null);

const REVIEW_BLOCKED: Record<string, string> = {
  abuse: 'අසභ්‍ය වචන ඉවත් කරන්න.',
  contact: 'දුරකථන අංක / ඊමේල් ලිපින සමාලෝචනයේ දැමිය නොහැක.',
  spam: 'සබැඳි හෝ නැවත නැවත අකුරු ඉවත් කරන්න.',
};

/** Seed: some reports and reviews from other owners, so the lists have something to show. */
const seed = (now: number): { reports: PlaceReport[]; reviews: PlaceReview[] } => ({
  reports: [
    { id: 's1', placeId: 'f5', userId: 'u1', kind: 'stock', fuel: 'Petrol 92', stock: 'out', at: now - 12 * MIN },
    { id: 's2', placeId: 'f5', userId: 'u2', kind: 'stock', fuel: 'Petrol 92', stock: 'out', at: now - 5 * MIN },
    { id: 's3', placeId: 'f1', userId: 'u3', kind: 'stock', fuel: 'Petrol 95', stock: 'available', at: now - 25 * MIN },
    { id: 's4', placeId: 'f1', userId: 'u4', kind: 'stock', fuel: 'Petrol 95', stock: 'available', at: now - 9 * MIN },
    { id: 's5', placeId: 'f1', userId: 'u5', kind: 'queue', queue: 'short', at: now - 15 * MIN },
    { id: 's6', placeId: 'e2', userId: 'u6', kind: 'queue', queue: 'long', at: now - 20 * MIN },
    { id: 's7', placeId: 'e3', userId: 'u7', kind: 'charger', plug: 'CHAdeMO', working: false, at: now - 40 * MIN },
    { id: 's8', placeId: 'e3', userId: 'u8', kind: 'charger', plug: 'CHAdeMO', working: false, at: now - 18 * MIN },
  ],
  reviews: [
    { id: 'r1', placeId: 'f1', userId: 'u3', name: 'තරිඳු පීරිස්', rating: 5, text: 'හැමදාම තෙල් තියෙනවා, පෝලිම කෙටියි.', at: now - 3 * 24 * 60 * MIN },
    { id: 'r2', placeId: 'f1', userId: 'u9', name: 'නිමල් ජයසිංහ', rating: 4, text: 'රෑ වෙලාවටත් විවෘතයි.', at: now - 6 * 24 * 60 * MIN },
    { id: 'r3', placeId: 'e1', userId: 'u2', name: 'කසුන් ප්‍රනාන්දු', rating: 4, text: 'වේගවත් charger එකක්, ගාස්තුව සාධාරණයි.', at: now - 2 * 24 * 60 * MIN },
    { id: 'r4', placeId: 'e3', userId: 'u7', name: 'සචිනි පෙරේරා', rating: 3, text: 'CHAdeMO එක නිතර නැහැ.', at: now - 24 * 60 * MIN },
    { id: 'r5', placeId: 'f3', userId: 'u4', name: 'ඉෂාන් සිල්වා', rating: 5, text: 'Car wash එකත් හොඳයි.', at: now - 5 * 24 * 60 * MIN },
  ],
});

export const PlaceCommunityProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { notify } = useNotice();
  const { fullName } = useProfile();
  const initial = useMemo(() => seed(Date.now()), []);
  const [reports, setReports] = useState<PlaceReport[]>(initial.reports);
  const [reviews, setReviews] = useState<PlaceReview[]>(initial.reviews);
  const [alerts, setAlerts] = useState<string[]>([]);
  const reportsRef = useRef(reports);
  reportsRef.current = reports;
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  // A re-render now and then so the freshness of reports (and their expiry) keeps up with the clock.
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 60 * 1000);
    return () => clearInterval(id);
  }, []);

  const stockOf = useCallback((placeId: string, fuel: FuelName) => crowdStock(reports, placeId, fuel, Date.now()), [reports]);
  const chargerOf = useCallback((placeId: string, plug: PlugType) => crowdCharger(reports, placeId, plug, Date.now()), [reports]);
  const queueOf = useCallback((placeId: string) => crowdQueue(reports, placeId, Date.now()), [reports]);
  const rating = useCallback((placeId: string) => summarizeReviews(reviews, placeId), [reviews]);

  const report = useCallback(
    (input: ReportInput, from: LatLng): ReportResult => {
      const place = PLACES.find((p) => p.id === input.placeId);
      if (!place) return { ok: false, reason: 'far', value: 0 };
      const now = Date.now();
      const lastAt = reportsRef.current.filter((r) => r.placeId === input.placeId && r.userId === ME).sort((a, b) => b.at - a.at)[0]?.at;
      const verdict = canReport(distanceKm(from, place.coords) * 1000, lastAt, now);
      if (!verdict.ok) return verdict;
      const before = input.kind === 'stock' ? crowdStock(reportsRef.current, input.placeId, input.fuel, now)?.value ?? place.fuels?.find((f) => f.name === input.fuel)?.stock ?? 'available' : undefined;
      const next: PlaceReport = { id: `m${now}`, placeId: input.placeId, userId: ME, at: now, ...(input.kind === 'stock' ? { kind: 'stock', fuel: input.fuel, stock: input.stock } : input.kind === 'charger' ? { kind: 'charger', plug: input.plug, working: input.working } : { kind: 'queue', queue: input.queue }) };
      setReports((rs) => [...rs, next]);
      notify({ icon: '👥', title: 'වාර්තාව සටහන් කළා', body: 'ස්තූතියි! ඔබේ වාර්තාව අනෙක් අයිතිකරුවන්ට උදව් වේ.', tone: 'success' });
      // "Tell me when it is back": the owners who asked are told once a fuel they were waiting on is reported available.
      if (input.kind === 'stock' && before && stockCameBack(before, input.stock)) {
        const key = `${input.placeId}:stock`;
        setAlerts((cur) => {
          if (cur.includes(key)) {
            timers.current.push(setTimeout(() => notify({ icon: '⛽', title: `${place.name}: ${input.fuel} ඇත`, body: 'ඔබ ඉල්ලූ ඉන්ධන තොගය නැවත ලැබී ඇත.', tone: 'success' }), 1200));
            return cur.filter((k) => k !== key);
          }
          return cur;
        });
      }
      return { ok: true };
    },
    [notify]
  );

  const review = useCallback(
    async (placeId: string, rating: number, text: string) => {
      if (!canReview(reviews, placeId, ME)) return { ok: false as const, reason: 'ඔබ දැනටමත් මේ ස්ථානය ශ්‍රේණිගත කර ඇත.' };
      if (text.trim()) {
        const m = await getAi().moderate(text);
        if (m.confidence >= SUGGEST_MIN_CONFIDENCE && !m.value.ok) return { ok: false as const, reason: m.value.reasons.map((r) => REVIEW_BLOCKED[r]).filter(Boolean).join(' ') || 'මෙම සටහන ප්‍රකාශයට පත් කළ නොහැක.' };
      }
      setReviews((rs) => [...rs, { id: `rv${Date.now()}`, placeId, userId: ME, name: fullName || 'ඔබ', rating, text: text.trim() || undefined, at: Date.now() }]);
      notify({ icon: '⭐', title: 'සමාලෝචනය එකතු කළා', body: 'ස්තූතියි!', tone: 'success' });
      return { ok: true as const };
    },
    [reviews, fullName, notify]
  );

  const hasReviewed = useCallback((placeId: string) => !canReview(reviews, placeId, ME), [reviews]);
  const isAlerted = useCallback((placeId: string, topic: AlertTopic) => alerts.includes(`${placeId}:${topic}`), [alerts]);
  const toggleAlert = useCallback(
    (placeId: string, topic: AlertTopic) => {
      const key = `${placeId}:${topic}`;
      const place = PLACES.find((p) => p.id === placeId);
      setAlerts((cur) => (cur.includes(key) ? cur.filter((k) => k !== key) : [...cur, key]));
      if (alerts.includes(key) || !place) return;
      notify({ icon: '🔔', title: 'දැනුම්දීම සක්‍රියයි', body: topic === 'stock' ? `${place.name}: ඉන්ධන තොගය ලැබුණොත් දන්වන්නම්.` : `${place.name}: plug එකක් නිදහස් වුණොත් දන්වන්නම්.`, tone: 'primary' });
      // A charger plug being freed has no report to wait for here, so it is simulated: a plug frees up a little later.
      if (topic === 'free') {
        timers.current.push(setTimeout(() => {
          setAlerts((cur) => cur.filter((k) => k !== key));
          notify({ icon: '🔌', title: `${place.name}: plug එකක් නිදහස්`, body: 'දැන් charge කරන්න පුළුවන්.', tone: 'success' });
        }, 12000));
      }
    },
    [alerts, notify]
  );

  const value: Api = { reports, reviews, stockOf, chargerOf, queueOf, rating, report, review, hasReviewed, alerts, isAlerted, toggleAlert };
  return <PlaceCommunityContext.Provider value={value}>{children}</PlaceCommunityContext.Provider>;
};

export const usePlaceCommunity = () => {
  const ctx = useContext(PlaceCommunityContext);
  if (!ctx) throw new Error('usePlaceCommunity must be used inside PlaceCommunityProvider');
  return ctx;
};
