import AsyncStorage from '@react-native-async-storage/async-storage';
import { learnedFrom, recordSearch, setLearnedTerms, type SearchEvent } from '@ongarage/shared';

// The owner's searches are kept on this device until there is a backend to send them to (see searchLog.ts in shared).
// Only the typed text, the number of results and the service tapped are stored: no location, no identity.
const STORAGE_KEY = 'ongarage.owner.searchLog';

export const loadSearchLog = async (): Promise<SearchEvent[]> => {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as SearchEvent[]) : [];
  } catch {
    return [];
  }
};

/** Keeps one finished search. Storage failing must never break the search itself. */
export const logSearch = async (event: SearchEvent): Promise<void> => {
  try {
    const events = recordSearch(await loadSearchLog(), event);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(events));
  } catch {
    // Not kept this time.
  }
};

/** Teaches the search the words owners on this device have used for a service. */
export const applyLearnedSearch = async (): Promise<void> => {
  setLearnedTerms(learnedFrom(await loadSearchLog()));
};
