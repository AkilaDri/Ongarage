/**
 * Tells the Activity screen which of its tabs to open, whichever way the owner arrives there: a booking just sent opens "Ongoing → Booking", an accepted bid opens "Ongoing → Bids", a payment to settle opens "Completed" - instead of whatever tab it was left on. The screen may not exist yet when this is called (the tab is only just being
 * opened), so the request is also kept until the screen takes it.
 */
export type ActivityFocus = { kind: 'current' | 'done' | 'ended' | 'mart'; current?: 'bids' | 'direct' | 'sos'; };
type Listener = (f: ActivityFocus) => void;
const listeners = new Set<Listener>();
let pending: ActivityFocus | null = null;

export const focusActivity = (f: ActivityFocus) => {
  pending = f;
  listeners.forEach((l) => l(f));
};

/** The request nobody has taken yet (the screen takes it when it opens). */
export const takeActivityFocus = () => {
  const f = pending;
  pending = null;
  return f;
};

export const onActivityFocus = (l: Listener) => {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
};
