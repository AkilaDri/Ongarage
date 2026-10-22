/**
 * The hamburger button sits in the top title bar (App) while the record it opens belongs to OnMart's On Feed: this is the signal between them.
 * `openFeedRecord()` is called by the button; the OnMart screen listens with `onOpenFeedRecord` and shows the record sheet.
 */
type Listener = () => void;
const listeners = new Set<Listener>();

export const openFeedRecord = () => listeners.forEach((l) => l());

export const onOpenFeedRecord = (l: Listener) => {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
};
