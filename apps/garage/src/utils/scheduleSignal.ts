/**
 * The calendar sits in the Schedule page's title bar (App) while a booking's details open inside the Schedule screen: this is the signal between them.
 * `openBookingDetail(id)` is called by the calendar; the Schedule screen listens with `onOpenBookingDetail` and opens that booking.
 */
type Listener = (id: string) => void;
const listeners = new Set<Listener>();

export const openBookingDetail = (id: string) => listeners.forEach((l) => l(id));

export const onOpenBookingDetail = (l: Listener) => {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
};

/** The "order this part from OnMart" button on a job card opens the parts request sheet, which lives in the Schedule screen. */
type PartsListener = (bookingId: string) => void;
const partsListeners = new Set<PartsListener>();
export const openPartsRequest = (id: string) => partsListeners.forEach((l) => l(id));
export const onOpenPartsRequest = (l: PartsListener) => {
  partsListeners.add(l);
  return () => {
    partsListeners.delete(l);
  };
};
