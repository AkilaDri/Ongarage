/**
 * The calendar button sits in the top title bar (App) while the records it opens belong to the Activity screen: this is the signal between them.
 * `openActivityCalendar()` is called by the button; the Activity screen listens with `onOpenActivityCalendar` and shows its calendar.
 */
type Listener = () => void;
const listeners = new Set<Listener>();

export const openActivityCalendar = () => listeners.forEach((l) => l());

export const onOpenActivityCalendar = (l: Listener) => {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
};
