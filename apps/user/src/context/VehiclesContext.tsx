import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MOCK_VEHICLES } from '../constants/mockData';
import type { Vehicle } from '@ongarage/shared';

const STORAGE_KEY = 'ongarage.addedVehicles';

export const VEHICLE_TYPES = [
  { id: 'Sedan', icon: '🚗', label: 'සෙඩාන්' },
  { id: 'Hatchback', icon: '🚘', label: 'හැච්බැක්' },
  { id: 'SUV', icon: '🚙', label: 'SUV' },
  { id: 'Van', icon: '🚐', label: 'වෑන්' },
  { id: 'Pickup', icon: '🛻', label: 'පිකප්' },
  { id: 'Motorbike', icon: '🏍️', label: 'යතුරුපැදි' },
  { id: 'Three-wheeler', icon: '🛺', label: 'ත්‍රීරෝද' },
] as const;

export const vehicleIcon = (type: string) => VEHICLE_TYPES.find((t) => t.id === type)?.icon ?? '🚗';

// "cab 1234", "CAB1234" and "wp-cab-1234" all become the "CAB-1234" / "WP-CAB-1234" form.
export const normalisePlate = (plate: string) =>
  plate
    .trim()
    .toUpperCase()
    .replace(/[\s_]+/g, '-')
    .replace(/([A-Z])(\d)/g, '$1-$2')
    .replace(/-+/g, '-');

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
