import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  canBookSlot,
  canCancel,
  canStartSession,
  cancelIsFree,
  estimateSession,
  isNoShow,
  makeEvCode,
  sessionAt,
  type BookBlock,
  type EvBooking,
  type PlugType,
} from '@ongarage/shared';
import { PLACES } from '../constants/places';
import { useNotice } from './NoticeContext';

/** The simulated charger runs this many minutes of charging per real second, so a session can be watched. */
const SIM_MIN_PER_SEC = 1;
const START_PCT = 24;

export type BookResult = BookBlock | { ok: true; booking: EvBooking };

type Api = {
  bookings: EvBooking[];
  /** The bookings at one charger, newest first. */
  bookingsAt: (placeId: string) => EvBooking[];
  book: (placeId: string, plug: PlugType, startAt: number, durationMin: number, vehicleId?: string) => BookResult;
  /** Cancels a booking; cancelling later than the free period counts as a no-show. Returns whether it was free. */
  cancel: (id: string) => boolean;
  /** The charger's scan of the booking's QR: starts the session. `demo` skips the time window (the simulation has no real charger to wait for). */
  startSession: (id: string, demo?: boolean) => void;
  stopSession: (id: string) => void;
  /** The session's numbers right now (simulated time). */
  liveSession: (b: EvBooking) => { pct: number; kwh: number; cost: number; minutes: number; full: boolean } | null;
};

const EvBookingContext = createContext<Api | null>(null);

export const EvBookingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { notify } = useNotice();
  const [bookings, setBookings] = useState<EvBooking[]>([]);
  const live = useRef(bookings);
  live.current = bookings;
  const [, setTick] = useState(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const connectorOf = (b: EvBooking) => PLACES.find((p) => p.id === b.placeId)?.connectors?.find((c) => c.type === b.plug);

  const liveSession = useCallback((b: EvBooking) => {
    const c = connectorOf(b);
    if (!b.session || !c) return null;
    if (b.session.endedAt !== undefined) return { pct: b.session.endPct ?? b.session.startPct, kwh: b.session.kwh ?? 0, cost: b.session.cost ?? 0, minutes: Math.round((b.session.endedAt - b.session.startedAt) / 1000 * SIM_MIN_PER_SEC), full: (b.session.endPct ?? 0) >= 100 };
    const minutes = ((Date.now() - b.session.startedAt) / 1000) * SIM_MIN_PER_SEC;
    return { ...sessionAt(c, b.session.startPct, minutes), minutes: Math.round(minutes) };
  }, []);

  const finish = useCallback((id: string, why: 'stopped' | 'full' | 'time') => {
    const b = live.current.find((x) => x.id === id);
    const c = b && connectorOf(b);
    if (!b || !c || b.status !== 'charging' || !b.session) return;
    const now = Date.now();
    const minutes = Math.min(b.durationMin, ((now - b.session.startedAt) / 1000) * SIM_MIN_PER_SEC);
    const end = sessionAt(c, b.session.startPct, minutes);
    setBookings((cur) => cur.map((x) => (x.id === id ? { ...x, status: 'done', session: { ...x.session!, endedAt: now, endPct: end.pct, kwh: end.kwh, cost: end.cost } } : x)));
    const place = PLACES.find((p) => p.id === b.placeId);
    notify({
      icon: '🔋',
      title: why === 'full' ? 'Battery 100% — charge කළා' : 'Charging අවසානයි',
      body: `${place?.name ?? ''}: kWh ${end.kwh} · ඇස්තමේන්තු ගාස්තුව රු. ${end.cost} (charger එකේදී ගෙවන්න).`,
      tone: 'success',
    });
  }, [notify]);

  // While a session runs it is redrawn every second and ends by itself when the battery is full or the booked time is used up; a booking nobody arrives for is a no-show.
  useEffect(() => {
    const id = setInterval(() => {
      const now = Date.now();
      let redraw = false;
      for (const b of live.current) {
        if (b.status === 'charging') {
          redraw = true;
          const s = liveSession(b);
          if (s?.full) finish(b.id, 'full');
          else if (s && s.minutes >= b.durationMin) finish(b.id, 'time');
        } else if (isNoShow(b, now)) {
          setBookings((cur) => cur.map((x) => (x.id === b.id ? { ...x, status: 'noShow', closedAt: now } : x)));
          const place = PLACES.find((p) => p.id === b.placeId);
          notify({ icon: '⏰', title: 'Slot එක අහිමි වුණා', body: `${place?.name ?? ''}: වේලාවට නොපැමිණීම නිසා වෙන් කිරීම අවලංගු වුණා.`, tone: 'danger' });
        }
      }
      if (redraw) setTick((n) => n + 1);
    }, 1000);
    return () => clearInterval(id);
  }, [finish, liveSession, notify]);

  const bookingsAt = useCallback((placeId: string) => bookings.filter((b) => b.placeId === placeId).sort((a, b) => b.createdAt - a.createdAt), [bookings]);

  const book = useCallback(
    (placeId: string, plug: PlugType, startAt: number, durationMin: number, vehicleId?: string): BookResult => {
      const place = PLACES.find((p) => p.id === placeId);
      const c = place?.connectors?.find((x) => x.type === plug);
      if (!place || !c) return { ok: false, reason: 'closed' };
      const now = Date.now();
      const verdict = canBookSlot(place, startAt, durationMin, live.current, now);
      if (!verdict.ok) return verdict;
      const est = estimateSession(c, durationMin);
      const booking: EvBooking = { id: `ev${now}`, placeId, plug, startAt, durationMin, status: 'booked', code: makeEvCode(now / 1000), vehicleId, createdAt: now, estKwh: est.kwh, estCost: est.cost };
      setBookings((cur) => [...cur, booking]);
      notify({ icon: '📅', title: 'Slot එක වෙන් කළා', body: `${place.name} · ${plug}. Charger එකේදී QR කේතය පෙන්වන්න.`, tone: 'success' });
      return { ok: true, booking };
    },
    [notify]
  );

  const cancel = useCallback(
    (id: string) => {
      const b = live.current.find((x) => x.id === id);
      if (!b || !canCancel(b)) return true;
      const now = Date.now();
      const free = cancelIsFree(b, now);
      setBookings((cur) => cur.map((x) => (x.id === id ? { ...x, status: free ? 'cancelled' : 'noShow', closedAt: now } : x)));
      notify(free ? { icon: '✖️', title: 'වෙන් කිරීම අවලංගු කළා', body: 'නොමිලේ අවලංගු කළා.', tone: 'primary' } : { icon: '⚠️', title: 'ප්‍රමාද අවලංගුවක්', body: 'වේලාවට ආසන්නව අවලංගු කිරීම no-show එකක් ලෙස ගණන් ගනී.', tone: 'danger' });
      return free;
    },
    [notify]
  );

  const startSession = useCallback(
    (id: string, demo?: boolean) => {
      const b = live.current.find((x) => x.id === id);
      if (!b || b.status !== 'booked') return;
      if (!demo && !canStartSession(b, Date.now())) return;
      setBookings((cur) => cur.map((x) => (x.id === id ? { ...x, status: 'charging', session: { startedAt: Date.now(), startPct: START_PCT } } : x)));
      notify({ icon: '🔌', title: 'Charging පටන් ගත්තා', body: 'QR කේතය scan වුණා.', tone: 'success' });
    },
    [notify]
  );

  const stopSession = useCallback((id: string) => finish(id, 'stopped'), [finish]);

  const value = useMemo<Api>(() => ({ bookings, bookingsAt, book, cancel, startSession, stopSession, liveSession }), [bookings, bookingsAt, book, cancel, startSession, stopSession, liveSession]);
  return <EvBookingContext.Provider value={value}>{children}</EvBookingContext.Provider>;
};

export const useEvBookings = () => {
  const ctx = useContext(EvBookingContext);
  if (!ctx) throw new Error('useEvBookings must be used inside EvBookingProvider');
  return ctx;
};
