import { useMemo } from 'react';
import type { Vehicle } from '@ongarage/shared';
import { useGarage } from './GarageContext';

const NONE: Vehicle = { id: 'none', name: 'වාහනයක් නැත', plate: '—', type: 'Sedan' };

/** The vehicles a garage can buy parts for: the ones on its jobs that are not finished (the id is the plate). */
export const useVehicles = () => {
  const { bookings } = useGarage();
  const vehicles = useMemo(() => {
    const seen = new Map<string, Vehicle>();
    for (const b of bookings) {
      if (b.status === 'completed' || b.status === 'cancelled' || seen.has(b.vehicle.plate)) continue;
      seen.set(b.vehicle.plate, { ...b.vehicle, id: b.vehicle.plate });
    }
    return [...seen.values()];
  }, [bookings]);
  const findVehicle = (id: string): Vehicle => vehicles.find((v) => v.id === id) ?? vehicles[0] ?? NONE;
  return { vehicles, findVehicle };
};
