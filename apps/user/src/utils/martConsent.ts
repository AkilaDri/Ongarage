import { useSyncExternalStore } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'ongarage.owner.martConsent';

// The owner's answer to the OnMart permission question, asked once and kept on this phone. The tab bar and the
// settings switch both read it. Saying no is not stored: the next visit to OnMart asks again.
let allowed = false;
const listeners = new Set<() => void>();
const publish = (next: boolean) => {
  allowed = next;
  listeners.forEach((l) => l());
};

AsyncStorage.getItem(KEY)
  .then((v) => v === '1' && publish(true))
  .catch(() => {});

export const setMartConsent = (next: boolean) => {
  publish(next);
  AsyncStorage.setItem(KEY, next ? '1' : '0').catch(() => {});
};

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
};
const read = () => allowed;

export const useMartConsent = () => useSyncExternalStore(subscribe, read, read);
