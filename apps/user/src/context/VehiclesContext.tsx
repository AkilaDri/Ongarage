import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MOCK_VEHICLES } from '../constants/mockData';
import { normalisePlate, type Vehicle } from '@ongarage/shared';

const STORAGE_KEY = 'ongarage.addedVehicles';
const EDITS_KEY = 'ongarage.vehicleEdits';
const ACTIVE_KEY = 'ongarage.activeVehicle';
const ARCHIVED_KEY = 'ongarage.archivedVehicles';
/** The vehicle the owner starts on when nothing was chosen yet. */
const FIRST_VEHICLE_ID = 'premio';

type VehiclesState = {
  vehicles: Vehicle[];
  findVehicle: (id: string) => Vehicle;
  addVehicle: (input: Omit<Vehicle, 'id'>) => Vehicle;
  /** Takes a vehicle out of the lists and pickers (sold, scrapped). Its past jobs and records stay: `findVehicle` still finds it. Refused for the last vehicle. */
  removeVehicle: (id: string) => boolean;
  restoreVehicle: (id: string) => void;
  /** The vehicles that were removed, newest first, so one can be brought back. */
  archivedVehicles: Vehicle[];
  /** Saves details the owner typed in (reg no, chassis, engine, make, model…) for any vehicle, the seeded ones too. */
  updateVehicle: (id: string, change: Partial<Omit<Vehicle, 'id'>>) => void;
  /** The vehicle every tab is about. One value for the whole app: changing it changes Home, Bids, Activity, OnMart and Account together. */
  activeVehicleId: string;
  setActiveVehicleId: (id: string) => void;
  activeVehicle: Vehicle;
  /** Bids and Activity show every vehicle's jobs when this is on; otherwise only the active vehicle's. */
  showAllVehicles: boolean;
  setShowAllVehicles: (on: boolean) => void;
  /** Whether a job, booking or record of this vehicle belongs in the lists the owner is looking at. */
  isInScope: (vehicleId?: string) => boolean;
};

const VehiclesContext = createContext<VehiclesState | null>(null);

export const VehiclesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [added, setAdded] = useState<Vehicle[]>([]);
  const [edits, setEdits] = useState<Record<string, Partial<Vehicle>>>({});
  const [activeId, setActiveId] = useState(FIRST_VEHICLE_ID);
  const [archivedIds, setArchivedIds] = useState<string[]>([]);
  const [showAllVehicles, setShowAllVehicles] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => raw && setAdded(JSON.parse(raw)))
      .catch(() => {});
    AsyncStorage.getItem(EDITS_KEY)
      .then((raw) => raw && setEdits(JSON.parse(raw)))
      .catch(() => {});
    AsyncStorage.getItem(ARCHIVED_KEY)
      .then((raw) => raw && setArchivedIds(JSON.parse(raw)))
      .catch(() => {});
    AsyncStorage.getItem(ACTIVE_KEY)
      .then((raw) => raw && setActiveId(raw))
      .catch(() => {});
  }, []);

  const everyVehicle = [...MOCK_VEHICLES, ...added].map((v) => (edits[v.id] ? { ...v, ...edits[v.id] } : v));
  // The lists and pickers show the vehicles that were not removed; the records of a removed one still look it up by id.
  const vehicles = everyVehicle.filter((v) => !archivedIds.includes(v.id));
  const archivedVehicles = archivedIds.map((id) => everyVehicle.find((v) => v.id === id)).filter((v): v is Vehicle => !!v).reverse();

  const findVehicle = useCallback(
    (id: string) => everyVehicle.find((v) => v.id === id) ?? vehicles[0],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [everyVehicle, vehicles]
  );

  const removeVehicle = useCallback(
    (id: string) => {
      if (vehicles.length <= 1 || !vehicles.some((v) => v.id === id)) return false;
      setArchivedIds((prev) => {
        const next = [...prev.filter((x) => x !== id), id];
        AsyncStorage.setItem(ARCHIVED_KEY, JSON.stringify(next)).catch(() => {});
        return next;
      });
      return true;
    },
    [vehicles]
  );
  const restoreVehicle = useCallback((id: string) => {
    setArchivedIds((prev) => {
      const next = prev.filter((x) => x !== id);
      AsyncStorage.setItem(ARCHIVED_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

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

  // A stored id that no longer exists (a vehicle removed or never added) falls back to the first vehicle.
  const activeVehicleId = vehicles.some((v) => v.id === activeId) ? activeId : vehicles[0].id;
  const setActiveVehicleId = useCallback((id: string) => {
    setActiveId(id);
    AsyncStorage.setItem(ACTIVE_KEY, id).catch(() => {});
  }, []);
  const activeVehicle = vehicles.find((v) => v.id === activeVehicleId) ?? vehicles[0];
  const isInScope = useCallback((vehicleId?: string) => showAllVehicles || vehicleId === activeVehicleId, [showAllVehicles, activeVehicleId]);

  return (
    <VehiclesContext.Provider value={{ vehicles, findVehicle, addVehicle, removeVehicle, restoreVehicle, archivedVehicles, updateVehicle, activeVehicleId, setActiveVehicleId, activeVehicle, showAllVehicles, setShowAllVehicles, isInScope }}>
      {children}
    </VehiclesContext.Provider>
  );
};

export const useVehicles = () => {
  const ctx = useContext(VehiclesContext);
  if (!ctx) throw new Error('useVehicles must be used inside VehiclesProvider');
  return ctx;
};
