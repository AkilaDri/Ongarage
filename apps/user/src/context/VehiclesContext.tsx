import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MOCK_VEHICLES } from '../constants/mockData';
import { normalisePlate, type Vehicle } from '@ongarage/shared';

const STORAGE_KEY = 'ongarage.addedVehicles';
const EDITS_KEY = 'ongarage.vehicleEdits';

type VehiclesState = {
  vehicles: Vehicle[];
  findVehicle: (id: string) => Vehicle;
  addVehicle: (input: Omit<Vehicle, 'id'>) => Vehicle;
  /** Saves details the owner typed in (reg no, chassis, engine, make, model…) for any vehicle, the seeded ones too. */
  updateVehicle: (id: string, change: Partial<Omit<Vehicle, 'id'>>) => void;
};

const VehiclesContext = createContext<VehiclesState | null>(null);

export const VehiclesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [added, setAdded] = useState<Vehicle[]>([]);
  const [edits, setEdits] = useState<Record<string, Partial<Vehicle>>>({});

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => raw && setAdded(JSON.parse(raw)))
      .catch(() => {});
    AsyncStorage.getItem(EDITS_KEY)
      .then((raw) => raw && setEdits(JSON.parse(raw)))
      .catch(() => {});
  }, []);

  const vehicles = [...MOCK_VEHICLES, ...added].map((v) => (edits[v.id] ? { ...v, ...edits[v.id] } : v));

  const findVehicle = useCallback(
    (id: string) => vehicles.find((v) => v.id === id) ?? vehicles[0],
    [vehicles]
  );

  const addVehicle = useCallback((input: Omit<Vehicle, 'id'>) => {
    const vehicle: Vehicle = { ...input, plate: normalisePlate(input.plate), id: `v-${Date.now()}` };
    setAdded((prev) => {
      const next = [...prev, vehicle];
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
    return vehicle;
  }, []);

  const updateVehicle = useCallback((id: string, change: Partial<Omit<Vehicle, 'id'>>) => {
    setEdits((prev) => {
      const next = { ...prev, [id]: { ...prev[id], ...change } };
      AsyncStorage.setItem(EDITS_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  return <VehiclesContext.Provider value={{ vehicles, findVehicle, addVehicle, updateVehicle }}>{children}</VehiclesContext.Provider>;
};

export const useVehicles = () => {
  const ctx = useContext(VehiclesContext);
  if (!ctx) throw new Error('useVehicles must be used inside VehiclesProvider');
  return ctx;
};
