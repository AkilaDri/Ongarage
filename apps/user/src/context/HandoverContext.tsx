import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { normalisePlate, type ServiceDetails, type Vehicle } from '@ongarage/shared';
import type { ServiceRecord } from '../components/ServiceRecordsSheet';

// Handing a sold vehicle's service history to its next owner. There is no backend yet, so the "server" is this phone: a handover is stored here, and claiming it
// with the code and the plate (from the same phone) copies the history to the new vehicle. With a backend the same two calls travel between two phones.

const HANDOVERS_KEY = 'ongarage.handovers';
const INHERITED_KEY = 'ongarage.inheritedHistory';
export const HANDOVER_DAYS = 7;
const DAY = 24 * 60 * 60 * 1000;

/** One record as the buyer sees it. Not shared: the seller's rating, the receipt number, and (unless the seller agreed) the amount paid. */
export type HandoverRecord = {
  id: string;
  icon: string;
  title: string;
  garage: string;
  at: number;
  /** Only when the seller chose to share what they paid. */
  amount?: number;
  warrantyUntil?: number;
  technician?: string;
  kind: 'job' | 'sos';
  /** Closed with the owner's code on OnGarage. */
  verified: boolean;
  service?: ServiceDetails;
};

export type Handover = {
  code: string;
  fromVehicleId: string;
  /** The vehicle as the buyer's copy starts (without the insurance number, which is personal). */
  vehicle: Omit<Vehicle, 'id'>;
  records: HandoverRecord[];
  sharePrices: boolean;
  createdAt: number;
  expiresAt: number;
  status: 'open' | 'claimed' | 'cancelled';
};

export type Inherited = { vehicleId: string; records: HandoverRecord[]; receivedAt: number; sharedPrices: boolean };

export type ClaimResult = { ok: true; handover: Handover } | { ok: false; reason: 'notFound' | 'plate' | 'expired' | 'cancelled' | 'used' };

type HandoverState = {
  handovers: Handover[];
  /** The open (not expired, not cancelled, not claimed) handover of a vehicle, if the owner started one. */
  openFor: (vehicleId: string) => Handover | undefined;
  create: (vehicle: Vehicle, records: ServiceRecord[], sharePrices: boolean) => Handover;
  cancel: (code: string) => void;
  /** Looks the code up and checks the plate; does not change anything (the buyer sees a preview first). */
  check: (code: string, plate: string) => ClaimResult;
  /** The buyer accepted: marks the handover used and keeps the history under the buyer's new vehicle. */
  accept: (handover: Handover, newVehicleId: string) => void;
  inheritedOf: (vehicleId: string) => Inherited | undefined;
};

const HandoverContext = createContext<HandoverState | null>(null);

export const DEMO_CODE = '246810';
const demoHandover = (): Handover => {
  const now = Date.now();
  const rec = (id: string, icon: string, title: string, garage: string, daysAgo: number, amount: number, warrantyDays?: number, km?: number): HandoverRecord => ({
    id,
    icon,
    title,
    garage,
    at: now - daysAgo * DAY,
    amount,
    warrantyUntil: warrantyDays ? now + warrantyDays * DAY : undefined,
    kind: 'job',
    verified: true,
    service: km ? { kind: 'full', fluids: ['engineOil'], mileageKm: km, notes: '' } as ServiceDetails : undefined,
  });
  return {
    code: DEMO_CODE,
    fromVehicleId: 'demo-seller',
    vehicle: { name: 'Aqua', plate: 'CAR-4567', type: 'Hatchback', make: 'Toyota', model: 'Aqua', color: 'White', fuelType: 'Hybrid' },
    records: [
      rec('demo-1', '🛢️', 'සම්පූර්ණ සේවාව', 'AutoTech Motors', 40, 18500, 60, 62400),
      rec('demo-2', '🛑', 'බ්‍රේක් පෑඩ් මාරු කිරීම', 'Speed Works', 150, 12400, undefined),
      rec('demo-3', '🔋', 'බැටරි පරීක්ෂාව', 'Galle Hybrid Care', 300, 3500, 120),
    ],
    sharePrices: true,
    createdAt: now,
    expiresAt: now + HANDOVER_DAYS * DAY,
    status: 'open',
  };
};

const newCode = (taken: string[]) => {
  let code = '';
  do code = String(Math.floor(100000 + Math.random() * 900000));
  while (taken.includes(code));
  return code;
};

export const HandoverProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [handovers, setHandovers] = useState<Handover[]>([]);
  const [inherited, setInherited] = useState<Inherited[]>([]);

  useEffect(() => {
    // A demo handover from "another owner" is always there to try the buyer's side with (code 246 810, plate CAR-4567); it is used up once claimed.
    AsyncStorage.getItem(HANDOVERS_KEY)
      .then((raw) => {
        const stored: Handover[] = raw ? JSON.parse(raw) : [];
        setHandovers(stored.some((h) => h.code === DEMO_CODE) ? stored : [...stored, demoHandover()]);
      })
      .catch(() => setHandovers([demoHandover()]));
    AsyncStorage.getItem(INHERITED_KEY).then((raw) => raw && setInherited(JSON.parse(raw))).catch(() => {});
  }, []);

  const saveHandovers = (next: Handover[]) => {
    AsyncStorage.setItem(HANDOVERS_KEY, JSON.stringify(next)).catch(() => {});
    return next;
  };

  const openFor = useCallback((vehicleId: string) => handovers.find((h) => h.fromVehicleId === vehicleId && h.status === 'open' && h.expiresAt > Date.now()), [handovers]);

  const create = useCallback(
    (vehicle: Vehicle, records: ServiceRecord[], sharePrices: boolean) => {
      const { id, insuranceNo, ...rest } = vehicle;
      void insuranceNo;
      const now = Date.now();
      const handover: Handover = {
        code: newCode(handovers.map((h) => h.code)),
        fromVehicleId: id,
        vehicle: rest,
        records: records.map((r) => ({
          id: r.id,
          icon: r.icon,
          title: r.title,
          garage: r.garage,
          at: r.at,
          amount: sharePrices ? r.amount : undefined,
          warrantyUntil: r.warrantyUntil,
          technician: r.technician,
          kind: r.kind,
          verified: true,
          service: r.service,
        })),
        sharePrices,
        createdAt: now,
        expiresAt: now + HANDOVER_DAYS * DAY,
        status: 'open',
      };
      // One open handover per vehicle: starting a new one cancels the old.
      setHandovers((prev) => saveHandovers([...prev.map((h) => (h.fromVehicleId === id && h.status === 'open' ? { ...h, status: 'cancelled' as const } : h)), handover]));
      return handover;
    },
    [handovers]
  );

  const cancel = useCallback((code: string) => setHandovers((prev) => saveHandovers(prev.map((h) => (h.code === code && h.status === 'open' ? { ...h, status: 'cancelled' as const } : h)))), []);

  const check = useCallback(
    (code: string, plate: string): ClaimResult => {
      const h = handovers.find((x) => x.code === code.trim());
      if (!h) return { ok: false, reason: 'notFound' };
      if (h.status === 'claimed') return { ok: false, reason: 'used' };
      if (h.status === 'cancelled') return { ok: false, reason: 'cancelled' };
      if (h.expiresAt <= Date.now()) return { ok: false, reason: 'expired' };
      if (normalisePlate(plate) !== normalisePlate(h.vehicle.plate)) return { ok: false, reason: 'plate' };
      return { ok: true, handover: h };
    },
    [handovers]
  );

  const accept = useCallback((handover: Handover, newVehicleId: string) => {
    setHandovers((prev) => saveHandovers(prev.map((h) => (h.code === handover.code ? { ...h, status: 'claimed' as const } : h))));
    setInherited((prev) => {
      const next = [...prev.filter((i) => i.vehicleId !== newVehicleId), { vehicleId: newVehicleId, records: handover.records, receivedAt: Date.now(), sharedPrices: handover.sharePrices }];
      AsyncStorage.setItem(INHERITED_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  const inheritedOf = useCallback((vehicleId: string) => inherited.find((i) => i.vehicleId === vehicleId), [inherited]);

  return <HandoverContext.Provider value={{ handovers, openFor, create, cancel, check, accept, inheritedOf }}>{children}</HandoverContext.Provider>;
};

export const useHandover = () => {
  const ctx = useContext(HandoverContext);
  if (!ctx) throw new Error('useHandover must be used inside HandoverProvider');
  return ctx;
};
