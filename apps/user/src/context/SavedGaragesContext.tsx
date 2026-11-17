import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// The garages the owner has saved with the heart. One list for the whole app, kept on the phone, so every heart (a card, the garage's own page,
// a list) agrees and Home can show them as a row. `hintSeen` is the one-time prompt that tells a new owner the heart exists.

const KEY = 'ongarage.savedGarages';
const HINT_KEY = 'ongarage.savedHintSeen';

interface SavedGaragesValue {
  ids: string[];
  isSaved: (id: string) => boolean;
  /** Saves or removes a garage; returns whether it is saved now. */
  toggle: (id: string) => boolean;
  /** False until the owner has either saved a garage or seen the one-time hint for a few seconds. */
  hintSeen: boolean;
  markHintSeen: () => void;
}

const SavedGaragesContext = createContext<SavedGaragesValue | null>(null);

export const SavedGaragesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [ids, setIds] = useState<string[]>([]);
  const [hintSeen, setHintSeen] = useState(true); // true until the stored value says otherwise, so the hint never flashes while loading
  const idsRef = useRef<string[]>([]);

  useEffect(() => {
    let live = true;
    Promise.all([AsyncStorage.getItem(KEY), AsyncStorage.getItem(HINT_KEY)])
      .then(([saved, seen]) => {
        if (!live) return;
        try {
          const list = saved ? (JSON.parse(saved) as unknown) : [];
          if (Array.isArray(list)) {
            const clean = list.filter((x): x is string => typeof x === 'string');
            idsRef.current = clean;
            setIds(clean);
          }
        } catch {
          // a damaged value: start with nothing saved
        }
        setHintSeen(seen === '1');
      })
      .catch(() => setHintSeen(false));
    return () => {
      live = false;
    };
  }, []);

  const markHintSeen = useCallback(() => {
    setHintSeen(true);
    AsyncStorage.setItem(HINT_KEY, '1').catch(() => {});
  }, []);

  const toggle = useCallback(
    (id: string) => {
      const has = idsRef.current.includes(id);
      const next = has ? idsRef.current.filter((x) => x !== id) : [id, ...idsRef.current];
      idsRef.current = next;
      setIds(next);
      AsyncStorage.setItem(KEY, JSON.stringify(next)).catch(() => {});
      markHintSeen();
      return !has;
    },
    [markHintSeen]
  );

  const value = useMemo<SavedGaragesValue>(() => ({ ids, isSaved: (id) => ids.includes(id), toggle, hintSeen, markHintSeen }), [ids, toggle, hintSeen, markHintSeen]);
  return <SavedGaragesContext.Provider value={value}>{children}</SavedGaragesContext.Provider>;
};

export const useSavedGarages = (): SavedGaragesValue => {
  const ctx = useContext(SavedGaragesContext);
  if (!ctx) throw new Error('useSavedGarages must be used inside SavedGaragesProvider');
  return ctx;
};
