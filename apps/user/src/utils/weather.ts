import { useEffect, useSyncExternalStore } from 'react';
import { useUserLocation } from '../context/LocationContext';

/** What the sky outside looks like, as the header animation draws it. */
export type Climate = 'clear' | 'partly' | 'cloudy' | 'fog' | 'rain' | 'storm';

/** WMO weather codes (what Open-Meteo reports) mapped to the few skies the animation can draw. */
export const climateFromCode = (code: number): Climate => {
  if (code === 0) return 'clear';
  if (code === 1 || code === 2) return 'partly';
  if (code === 45 || code === 48) return 'fog';
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return 'rain';
  if (code >= 95) return 'storm';
  return 'cloudy';
};

// One shared reading for every sky on screen (Home, the OnMart band, ...): it is fetched once per place and refreshed every 20 minutes.
// Until a reading arrives (or when there is no network) the sky stays clear, as it was before.
let current: Climate = 'clear';
let placeKey = '';
const listeners = new Set<() => void>();
const set = (next: Climate) => {
  if (next === current) return;
  current = next;
  listeners.forEach((l) => l());
};

let lastFetch = 0;
const load = async (latitude: number, longitude: number) => {
  // Several skies can be on screen at once and each asks; one reading a minute is plenty.
  if (Date.now() - lastFetch < 60000 && placeKey) return;
  lastFetch = Date.now();
  const ctl = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timer = setTimeout(() => ctl?.abort(), 8000);
  try {
    // The place is rounded to 2 decimals (about 1 km) before it leaves the phone: a weather reading does not need the exact spot.
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude.toFixed(2)}&longitude=${longitude.toFixed(2)}&current=weather_code`;
    const res = await fetch(url, ctl ? { signal: ctl.signal } : undefined);
    if (!res.ok) return;
    const json = (await res.json()) as { current?: { weather_code?: number } };
    const code = json.current?.weather_code;
    if (typeof code === 'number') set(climateFromCode(code));
  } catch {
    // Offline or blocked: keep the last sky.
  } finally {
    clearTimeout(timer);
  }
};

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
};

/** The climate at the owner's location, kept current while a sky is on screen. */
export const useClimate = (): Climate => {
  const { coords } = useUserLocation();
  const { latitude, longitude } = coords;
  useEffect(() => {
    const key = `${latitude.toFixed(2)},${longitude.toFixed(2)}`;
    if (key !== placeKey) {
      placeKey = key;
      load(latitude, longitude);
    }
    const id = setInterval(() => load(latitude, longitude), 20 * 60 * 1000);
    return () => clearInterval(id);
  }, [latitude, longitude]);
  return useSyncExternalStore(subscribe, () => current, () => current);
};
