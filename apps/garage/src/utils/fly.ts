/**
 * A small token that flies to where the thing now lives: a bid just sent flies to "My bids" (Jobs), a booking just taken (or a won bid) flies to the Schedule,
 * a job just finished flies to the completed ones (also in the Schedule). `flyTo` is called where the thing happens (the context); the FlyLayer in App draws it.
 */
export type FlyKind = 'bid' | 'schedule' | 'done';
type Listener = (kind: FlyKind) => void;
const listeners = new Set<Listener>();

export const flyTo = (kind: FlyKind) => listeners.forEach((l) => l(kind));

export const onFly = (l: Listener) => {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
};

/** A place a token lands, measured when it is needed (the page may have moved: the header comes back down while the token flies). */
export type FlyPoint = { x: number; y: number };
const targets = new Map<FlyKind, () => Promise<FlyPoint | null>>();
export const registerFlyTarget = (kind: FlyKind, measure: (() => Promise<FlyPoint | null>) | null) => {
  if (measure) targets.set(kind, measure);
  else targets.delete(kind);
};
export const measureFlyTarget = (kind: FlyKind) => targets.get(kind)?.() ?? Promise.resolve(null);
