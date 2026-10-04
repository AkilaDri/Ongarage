import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import * as Location from 'expo-location';
import { reverseGeocode } from '@ongarage/shared';
import { DEFAULT_COORDS, MOCK_USER } from '../constants/mockData';
import type { LatLng } from '@ongarage/shared';

type LocationState = {
  coords: LatLng;
  address: string;
  locality: string;
  status: 'locating' | 'ready' | 'denied' | 'fallback';
  refresh: () => Promise<LatLng>;
};

const LocationContext = createContext<LocationState | null>(null);

export const LocationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [coords, setCoords] = useState<LatLng>(DEFAULT_COORDS);
  const [address, setAddress] = useState(MOCK_USER.city);
  const [locality, setLocality] = useState(MOCK_USER.city);
  const [status, setStatus] = useState<LocationState['status']>('locating');

  const refresh = useCallback(async () => {
    setStatus('locating');
    let next = DEFAULT_COORDS;
    try {
      const { granted } = await Location.requestForegroundPermissionsAsync();
      if (!granted) {
        setStatus('denied');
        return next;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      next = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
      setCoords(next);
      setStatus('ready');
    } catch {
      setStatus('fallback');
      return next;
    }
    try {
      const geo = await reverseGeocode(next);
      setAddress(geo.address);
      setLocality(geo.locality);
    } catch {
      // Keep the previous label when Geocoding is unavailable.
    }
    return next;
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <LocationContext.Provider value={{ coords, address, locality, status, refresh }}>{children}</LocationContext.Provider>
  );
};

export const useUserLocation = () => {
  const ctx = useContext(LocationContext);
  if (!ctx) throw new Error('useUserLocation must be used inside LocationProvider');
  return ctx;
};
