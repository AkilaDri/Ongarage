import type { PartType } from '../types';

// The market reference every app prices parts against: garages estimating a diagnosis,
// technicians writing one, parts shops quoting. A backend would serve live prices.

/** Typical Genuine list prices (LKR). OEM and Recon are cheaper (PART_TYPE_FACTOR). */
export const PART_LIST_PRICES: Record<string, number> = {
  'Engine mount': 14500,
  'Timing belt': 9800,
  'Clutch plate': 18500,
  'Engine oil 4L': 8200,
  'Oil filter': 1650,
  Alternator: 38000,
  'Starter motor': 32000,
  'Fuse set': 1200,
  'Wiring connector': 950,
  'AC gas': 4500,
  'AC compressor': 65000,
  'Cabin filter': 2400,
  'O2 sensor': 16500,
  'MAF sensor': 21000,
  'Spark plugs (set)': 7600,
  'Brake pads (front)': 9500,
  'Brake pads (rear)': 8200,
  'Brake disc': 12800,
  'Brake fluid': 1900,
  'Air filter (performance)': 11500,
  'Air filter': 2600,
  'Battery 12V 45Ah': 27500,
  'Battery terminals': 1100,
};
export const DEFAULT_PART_PRICE = 5000;

export const PART_TYPE_FACTOR: Record<Exclude<PartType, 'GarageChoice'>, number> = { Genuine: 1, OEM: 0.72, Recon: 0.55 };

/** Genuine list price of a part. */
export const partListPrice = (name: string) => PART_LIST_PRICES[name] ?? DEFAULT_PART_PRICE;

/** Typical price of a part of a type, rounded to 50 (Garage's choice is priced as OEM). */
export const partMarketPrice = (name: string, type: PartType) =>
  Math.round((partListPrice(name) * PART_TYPE_FACTOR[type === 'GarageChoice' ? 'OEM' : type]) / 50) * 50;
