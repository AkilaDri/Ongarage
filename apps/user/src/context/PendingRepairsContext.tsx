import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// A part the owner chose "not now" for during an SOS job. The vehicle remembers it, so it is listed on the vehicle's
// service records until it is fitted; nothing is billed for it.

export type PendingRepair = {
  id: string;
  vehicleId: string;
  vehiclePlate: string;
  vehicleName: string;
  /** The SOS job it came from. */
  sosId: string;
  part: string;
  price: number;
  /** Brakes, tyres, lights and the like: the owner was warned before they deferred it. */
  safety: boolean;
  reason: string;
  noticedAt: number;
};

type PendingRepairsState = {
  repairs: PendingRepair[];
  addRepair: (repair: PendingRepair) => void;
};

const STORAGE_KEY = 'ongarage.pendingRepairs';

const PendingRepairsContext = createContext<PendingRepairsState | null>(null);

export const PendingRepairsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [repairs, setRepairs] = useState<PendingRepair[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (raw) setRepairs(JSON.parse(raw) as PendingRepair[]);
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  useEffect(() => {
    if (!loaded) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(repairs)).catch(() => {});
  }, [repairs, loaded]);

  // The same part from the same SOS job is kept once, however many times the choice is confirmed.
  const addRepair = useCallback((repair: PendingRepair) => {
    setRepairs((prev) => (prev.some((r) => r.id === repair.id) ? prev : [repair, ...prev]));
  }, []);

  const value = useMemo(() => ({ repairs, addRepair }), [repairs, addRepair]);
  return <PendingRepairsContext.Provider value={value}>{children}</PendingRepairsContext.Provider>;
};

export const usePendingRepairs = () => {
  const ctx = useContext(PendingRepairsContext);
  if (!ctx) throw new Error('usePendingRepairs must be used inside PendingRepairsProvider');
  return ctx;
};

/** The parts a vehicle still needs, newest first. */
export const pendingRepairsOf = (repairs: PendingRepair[], vehicleId: string) => repairs.filter((r) => r.vehicleId === vehicleId);
