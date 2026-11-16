// The rules for booking a time with a garage, the same for a direct booking and for a quote the owner has accepted.

const MIN = 60 * 1000;
const HOUR = 60 * MIN;

/** The hours a garage takes bookings: a time outside them gets the next opening proposed instead. */
export const GARAGE_OPEN_HOUR = 8;
export const GARAGE_CLOSE_HOUR = 17;
/** The start times offered in the booking form. */
export const BOOKING_SLOT_HOURS = [8, 10, 12, 14, 16, 18];
/** The garage must answer a booking request within this (the same as the garage app's direct-request limit). */
export const GARAGE_RESPOND_WITHIN_MS = 2 * HOUR;
/** After the owner accepts a quote, they have this long to pick a time; then the acceptance lapses and the other quotes reopen. */
export const PICK_TIME_WITHIN_MS = 24 * HOUR;

/** What the garage answers to a requested time. */
export type SlotAnswer = { kind: 'confirm' } | { kind: 'propose'; at: number };

/**
 * A time inside the opening hours is confirmed. Otherwise the garage proposes 9:00 on the next day it is open:
 * the same day when the time is before opening, the next day when it is after closing.
 */
export const garageAnswerFor = (preferredAt: number): SlotAnswer => {
  const hour = new Date(preferredAt).getHours();
  if (hour >= GARAGE_OPEN_HOUR && hour < GARAGE_CLOSE_HOUR) return { kind: 'confirm' };
  const next = new Date(preferredAt + (hour >= GARAGE_CLOSE_HOUR ? 24 * HOUR : 0));
  next.setHours(9, 0, 0, 0);
  return { kind: 'propose', at: next.getTime() };
};

/** The time the owner must have picked by, counted from when the quote was accepted. */
export const pickTimeDeadline = (acceptedAt: number) => acceptedAt + PICK_TIME_WITHIN_MS;
