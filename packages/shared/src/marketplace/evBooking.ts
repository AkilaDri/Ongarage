import type { Connector, Place, PlugType } from './places';

/**
 * Booking a charging slot at an EV charger (service mode 'place', Phase 4): the slots a connector has free, the booking and its QR, the no-show rule and the
 * numbers of a running session (battery, energy, cost). The cost is an estimate and is paid at the charger; nothing here moves money.
 */
export const SLOT_MIN = 30;
export const DURATIONS_MIN = [30, 60, 90, 120];
/** A slot cannot start sooner than this from now. */
export const BOOK_LEAD_MIN = 15;
/** How many days ahead a slot can be booked (today counts as the first). */
export const BOOK_DAYS = 2;
/** The booking is lost this many minutes after its start if the owner has not arrived and scanned. */
export const NO_SHOW_GRACE_MIN = 15;
/** Cancelling is free until this long before the start. */
export const FREE_CANCEL_MIN = 30;
/** This many no-shows within `NO_SHOW_WINDOW_DAYS` pause new bookings (SOS, finding chargers and charging without a booking are never paused). */
export const NO_SHOW_LIMIT = 3;
export const NO_SHOW_WINDOW_DAYS = 30;
/** Battery size used when the vehicle does not say (kWh), and how much of the plug's power a car really takes. */
export const DEFAULT_BATTERY_KWH = 40;
export const CHARGE_EFFICIENCY = 0.9;

export type EvBookingStatus = 'booked' | 'charging' | 'done' | 'cancelled' | 'noShow';

export type EvBooking = {
  id: string;
  placeId: string;
  plug: PlugType;
  startAt: number;
  durationMin: number;
  status: EvBookingStatus;
  /** Six digits to show at the charger (QR payload `evCodePayload`). */
  code: string;
  vehicleId?: string;
  createdAt: number;
  /** Estimate made at booking time. */
  estKwh: number;
  estCost: number;
  /** A running or finished session. */
  session?: { startedAt: number; startPct: number; endedAt?: number; endPct?: number; kwh?: number; cost?: number };
  /** When a no-show or a cancellation was recorded. */
  closedAt?: number;
};

const MIN = 60 * 1000;
const DAY = 24 * 60 * MIN;

export const evCodePayload = (code: string) => `ongarage:ev:${code}`;
export const makeEvCode = (seed: number) => String(100000 + (Math.abs(Math.floor(seed * 7919)) % 900000));

/** "7.00 - 21.00" as minutes of the day, or null when it cannot be read. */
export const parseHours = (hours: string | undefined): { from: number; to: number } | null => {
  const m = hours?.match(/(\d{1,2})[.:](\d{2})\s*-\s*(\d{1,2})[.:](\d{2})/);
  if (!m) return null;
  return { from: Number(m[1]) * 60 + Number(m[2]), to: Number(m[3]) * 60 + Number(m[4]) };
};

/** Plugs of a connector that can be booked at all (a plug out of order cannot). */
export const bookablePlugs = (c: Connector) => c.states.filter((s) => s !== 'offline').length;

const startOfDay = (t: number) => {
  const d = new Date(t);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};

const overlaps = (aStart: number, aEnd: number, b: EvBooking) => b.status !== 'cancelled' && b.status !== 'noShow' && b.status !== 'done' && aStart < b.startAt + b.durationMin * MIN && b.startAt < aEnd;

export type Slot = { startAt: number; free: number };

/**
 * The slots a connector offers on one day (`dayOffset` 0 = today): one every `SLOT_MIN` inside the opening hours that can hold the whole `durationMin`, from
 * `BOOK_LEAD_MIN` from now on, with how many plugs are still free (the bookings of the same place and plug type count against the bookable plugs).
 */
export const slotsFor = (place: Place, plug: PlugType, dayOffset: number, durationMin: number, bookings: EvBooking[], now: number): Slot[] => {
  const c = place.connectors?.find((x) => x.type === plug);
  if (!c) return [];
  const cap = bookablePlugs(c);
  if (!cap) return [];
  const day = startOfDay(now) + dayOffset * DAY;
  const range = place.open24 ? { from: 0, to: 24 * 60 } : parseHours(place.hours);
  if (!range) return [];
  const mine = bookings.filter((b) => b.placeId === place.id && b.plug === plug);
  const out: Slot[] = [];
  for (let m = range.from; m + durationMin <= range.to; m += SLOT_MIN) {
    const startAt = day + m * MIN;
    if (startAt < now + BOOK_LEAD_MIN * MIN) continue;
    const taken = mine.filter((b) => overlaps(startAt, startAt + durationMin * MIN, b)).length;
    if (taken < cap) out.push({ startAt, free: cap - taken });
  }
  return out;
};

/** What a session of `durationMin` at the plug would give, for the estimate shown when booking: energy taken (limited by the battery) and its cost. */
export const estimateSession = (c: Connector, durationMin: number, batteryKwh = DEFAULT_BATTERY_KWH) => {
  const kwh = Math.min(batteryKwh, Math.round(c.kw * (durationMin / 60) * CHARGE_EFFICIENCY * 10) / 10);
  return { kwh, cost: Math.round(kwh * c.price) };
};

/** A booking not used within the grace time after its start. */
export const isNoShow = (b: EvBooking, now: number) => b.status === 'booked' && now > b.startAt + NO_SHOW_GRACE_MIN * MIN;
/** Minutes left until the booking starts (negative once it has). */
export const minutesToStart = (b: EvBooking, now: number) => Math.ceil((b.startAt - now) / MIN);
export const canCancel = (b: EvBooking) => b.status === 'booked';
/** True when cancelling now is still free (more than `FREE_CANCEL_MIN` before the start); a late cancel counts as a no-show. */
export const cancelIsFree = (b: EvBooking, now: number) => b.startAt - now >= FREE_CANCEL_MIN * MIN;
/** The scan can start the session from a few minutes before the start until the grace time is over. */
export const canStartSession = (b: EvBooking, now: number) => b.status === 'booked' && now >= b.startAt - 10 * MIN && now <= b.startAt + NO_SHOW_GRACE_MIN * MIN;

export const noShowCount = (bookings: EvBooking[], now: number) => bookings.filter((b) => b.status === 'noShow' && now - (b.closedAt ?? b.startAt) < NO_SHOW_WINDOW_DAYS * DAY).length;

export type BookBlock = { ok: true } | { ok: false; reason: 'noShows' | 'overlap' | 'closed' };

/** May the owner book this slot? Paused after repeated no-shows; one booking at a time overlapping in time (a person has one car at a charger). */
export const canBookSlot = (place: Place, startAt: number, durationMin: number, mine: EvBooking[], now: number): BookBlock => {
  if (noShowCount(mine, now) >= NO_SHOW_LIMIT) return { ok: false, reason: 'noShows' };
  if (mine.some((b) => overlaps(startAt, startAt + durationMin * MIN, b))) return { ok: false, reason: 'overlap' };
  if (!place.open24 && !parseHours(place.hours)) return { ok: false, reason: 'closed' };
  return { ok: true };
};

/**
 * The numbers of a running session `elapsedMin` minutes in: the battery rises at the plug's power (times the car's efficiency) and slows to half above 80%,
 * stops at 100%. `kwh` and `cost` are what has been taken so far.
 */
export const sessionAt = (c: Connector, startPct: number, elapsedMin: number, batteryKwh = DEFAULT_BATTERY_KWH) => {
  let pct = startPct;
  let kwh = 0;
  const step = 0.5;
  for (let t = 0; t < elapsedMin && pct < 100; t += step) {
    const power = c.kw * CHARGE_EFFICIENCY * (pct >= 80 ? 0.5 : 1);
    const add = (power * step) / 60;
    const room = ((100 - pct) / 100) * batteryKwh;
    const take = Math.min(add, room);
    kwh += take;
    pct += (take / batteryKwh) * 100;
  }
  pct = Math.min(100, Math.round(pct * 10) / 10);
  kwh = Math.round(kwh * 10) / 10;
  return { pct, kwh, cost: Math.round(kwh * c.price), full: pct >= 100 };
};
