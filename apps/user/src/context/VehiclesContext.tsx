import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MOCK_VEHICLES } from '../constants/mockData';
import { normalisePlate, type Vehicle } from '@ongarage/shared';

const STORAGE_KEY = 'ongarage.addedVehicles';

type VehiclesState = {
  vehicles: Vehicle[];
  findVehicle: (id: string) => Vehicle;
  addVehicle: (input: Omit<Vehicle, 'id'>) => Vehicle;
};

const VehiclesContext = createContext<VehiclesState | null>(null);

export const VehiclesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [added, setAdded] = useState<Vehicle[]>([]);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => raw && setAdded(JSON.parse(raw)))
      .catch(() => {});
  }, []);

  const vehicles = [...MOCK_VEHICLES, ...added];

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

  return <VehiclesContext.Provider value={{ vehicles, findVehicle, addVehicle }}>{children}</VehiclesContext.Provider>;
};

export const useVehicles = () => {
  const ctx = useContext(VehiclesContext);
  if (!ctx) throw new Error('useVehicles must be used inside VehiclesProvider');
  return ctx;
};
