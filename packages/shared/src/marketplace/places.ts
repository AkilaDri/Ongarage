import type { LatLng } from '../types';

/**
 * Places an owner goes to rather than hires: fuel stations and EV charging points (service mode 'place', see constants/categories). The model and the filters are
 * here so every app reads them the same way; the demo data lives in the owner app until a backend (or a places service) supplies it.
 */
export type PlaceKind = 'fuel' | 'ev';
export type FuelStock = 'available' | 'low' | 'out';
export type FuelName = 'Petrol 92' | 'Petrol 95' | 'Auto Diesel' | 'Super Diesel';
export type PlugType = 'Type 2' | 'CCS2' | 'CHAdeMO';
export type ChargerState = 'free' | 'busy' | 'offline';
export type Amenity = 'Car Wash' | 'Tyre Shop' | 'Mini Mart' | 'ATM' | 'Toilet' | 'Air';

export const FUEL_NAMES: FuelName[] = ['Petrol 92', 'Petrol 95', 'Auto Diesel', 'Super Diesel'];
export const PLUG_TYPES: PlugType[] = ['Type 2', 'CCS2', 'CHAdeMO'];
export const AMENITIES: Amenity[] = ['Car Wash', 'Tyre Shop', 'Mini Mart', 'ATM'];
/** From this power up a charger counts as a fast charger (DC fast charging); under it is slow (AC). */
export const FAST_KW = 50;

export type FuelOffer = { name: FuelName; /** LKR per litre. */ price: number; stock: FuelStock };
export type Connector = { type: PlugType; kw: number; /** LKR per kWh. */ price: number; /** One entry per physical connector of this kind (a station with 3 CCS2 plugs has 3). */ states: ChargerState[] };

export type Place = {
  id: string;
  kind: PlaceKind;
  name: string;
  /** The brand or operator (Ceypetco, IOC, Sinopec ... / a charging network). */
  brand: string;
  coords: LatLng;
  address: string;
  phone: string;
  open24: boolean;
  /** Opening hours when it is not open all day, e.g. "6.00 - 22.00". */
  hours?: string;
  /** Open right now. */
  open: boolean;
  /** The sub-services it offers, named as in the category (Petrol, Diesel, Tyre Air Check ... / AC Charging Port, DC Fast Charging). */
  services: string[];
  amenities: Amenity[];
  fuels?: FuelOffer[];
  connectors?: Connector[];
};

/** How many plugs of a connector are free right now. */
export const freePlugs = (c: Connector) => c.states.filter((s) => s === 'free').length;

export type PlaceFilter = {
  open?: boolean;
  /** Open all day. */
  open24?: boolean;
  /** Fuel stations: sells this fuel and has some of it (not out of stock). */
  fuel?: FuelName | null;
  /** Chargers: has this plug type. */
  plug?: PlugType | null;
  /** Chargers: 'fast' (FAST_KW and up) or 'slow'. */
  speed?: 'fast' | 'slow' | null;
  /** Chargers: only those with a free plug right now. */
  freeNow?: boolean;
  /** Every one of these must be there. */
  amenities?: Amenity[];
};

export const filterPlaces = (places: Place[], f: PlaceFilter): Place[] =>
  places.filter((p) => {
    if (f.open && !p.open) return false;
    if (f.open24 && !p.open24) return false;
    if (f.fuel && !p.fuels?.some((x) => x.name === f.fuel && x.stock !== 'out')) return false;
    if (f.plug && !p.connectors?.some((c) => c.type === f.plug)) return false;
    if (f.speed === 'fast' && !p.connectors?.some((c) => c.kw >= FAST_KW)) return false;
    if (f.speed === 'slow' && !p.connectors?.some((c) => c.kw < FAST_KW)) return false;
    if (f.freeNow && !p.connectors?.some((c) => freePlugs(c) > 0)) return false;
    if (f.amenities?.length && !f.amenities.every((a) => p.amenities.includes(a))) return false;
    return true;
  });

/** What the owner's vehicle suggests for the filters: its fuel, or the plug of an electric one. Nothing is forced; the owner can clear it. */
export type VehicleFuel = 'Petrol' | 'Diesel' | 'Hybrid' | 'Electric';
export const filterDefaultsFor = (v: { fuelType?: VehicleFuel; connectorType?: PlugType } | undefined, kind: PlaceKind): Pick<PlaceFilter, 'fuel' | 'plug'> => {
  if (!v) return {};
  if (kind === 'fuel') return v.fuelType === 'Diesel' ? { fuel: 'Auto Diesel' } : v.fuelType === 'Petrol' || v.fuelType === 'Hybrid' ? { fuel: 'Petrol 92' } : {};
  return v.fuelType === 'Electric' && v.connectorType ? { plug: v.connectorType } : {};
};

/** Sorts nearest first. */
export const nearestFirst = <T extends { distance: number }>(list: T[]): T[] => [...list].sort((a, b) => a.distance - b.distance);
