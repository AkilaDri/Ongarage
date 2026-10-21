/**
 * A small token that flies to where the thing now lives: a job posted for bids flies to Bids, a bid that has come in is "ready" there, a booking sent (or a bid accepted)
 * flies to Activity, a finished job flies to Activity's completed ones. `flyTo` is called where it happens (the contexts); the FlyLayer in App draws it.
 */
export type FlyKind = 'posted' | 'bidReady' | 'booked' | 'done';
type Listener = (kind: FlyKind) => void;
const listeners = new Set<Listener>();

export const flyTo = (kind: FlyKind) => listeners.forEach((l) => l(kind));

export const onFly = (l: Listener) => {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
};
