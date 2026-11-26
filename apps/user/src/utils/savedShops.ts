import { useSyncExternalStore } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// The parts shops the owner saved with the heart: one list for every heart (a card, a shop's page, a list) and for OnMart's saved row, kept on the
// phone, newest first. `hintSeen` is the one-time tip that tells a new owner the heart exists. The same rules as saved garages (context/SavedGaragesContext).

const KEY = 'ongarage.savedShops';
const HINT_KEY = 'ongarage.savedShopsHintSeen';

type State = { ids: string[]; hintSeen: boolean };
// The tip counts as seen until the stored value says otherwise, so it never flashes while loading.
let state: State = { ids: [], hintSeen: true };
const listeners = new Set<() => void>();
const publish = (change: Partial<State>) => {
  state = { ...state, ...change };
  listeners.forEach((l) => l());
};

Promise.all([AsyncStorage.getItem(KEY), AsyncStorage.getItem(HINT_KEY)])
  .then(([saved, seen]) => {
    let ids: string[] = [];
    try {
      const list = saved ? (JSON.parse(saved) as unknown) : [];
      if (Array.isArray(list)) ids = list.filter((x): x is string => typeof x === 'string');
    } catch {
      // a damaged value: start with nothing saved
    }
    // Anything saved while this was loading stays, in front.
    publish({ ids: [...state.ids, ...ids.filter((x) => !state.ids.includes(x))], hintSeen: seen === '1' });
  })
  .catch(() => publish({ hintSeen: false }));

export const markShopHintSeen = () => {
  publish({ hintSeen: true });
  AsyncStorage.setItem(HINT_KEY, '1').catch(() => {});
};

/** Saves or removes a shop; returns whether it is saved now. */
export const toggleSavedShop = (id: string) => {
  const has = state.ids.includes(id);
  const ids = has ? state.ids.filter((x) => x !== id) : [id, ...state.ids];
  publish({ ids });
  AsyncStorage.setItem(KEY, JSON.stringify(ids)).catch(() => {});
  markShopHintSeen();
  return !has;
};

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
};
const read = () => state;

export const useSavedShops = () => useSyncExternalStore(subscribe, read, read);
