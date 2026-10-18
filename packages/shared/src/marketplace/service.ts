import type { ServiceDetails, ServiceFluid, ServiceKind } from '../types';

// Routine servicing (oil change, full service, fluids): the garage records what was done, the mileage and when the next
// service is due; the owner keeps every record and is reminded before the next one.

/** The "Service" category's id in SERVICE_CATEGORIES. */
export const SERVICE_CATEGORY_ID = '14';
export const isServiceCategory = (categoryId?: string) => categoryId === SERVICE_CATEGORY_ID;

/** The sub-services the owner picks when booking a service. */
export const SERVICE_SUBCATEGORIES = ['Full Service', 'Oil Change', 'Engine Oil', 'Transmission Oil', 'Brake Fluid', 'Power Steering Oil'];

export const SERVICE_KINDS: { id: ServiceKind; label: string; hint: string }[] = [
  { id: 'full', label: 'Full service', hint: 'තෙල්, පෙරහන් සහ තරල සියල්ල පරීක්ෂා කර වෙනස් කිරීම' },
  { id: 'oil', label: 'Oil change', hint: 'එන්ජින් තෙල් සහ තෙල් පෙරහන' },
  { id: 'fluids', label: 'තරල වෙනස් කිරීම', hint: 'තෝරන තරල පමණක් (ට්‍රාන්ස්මිෂන්, බ්‍රේක්, පවර් ස්ටියරින්…)' },
];

export const SERVICE_FLUIDS: { id: ServiceFluid; label: string }[] = [
  { id: 'engineOil', label: 'එන්ජින් තෙල්' },
  { id: 'transmission', label: 'ට්‍රාන්ස්මිෂන් තෙල්' },
  { id: 'brakeFluid', label: 'බ්‍රේක් තරලය' },
  { id: 'powerSteering', label: 'පවර් ස්ටියරින් තෙල්' },
];

/** The fluids a kind of service changes by default (the garage can adjust them for "fluids"). */
export const defaultFluids = (kind: ServiceKind): ServiceFluid[] => (kind === 'full' ? SERVICE_FLUIDS.map((f) => f.id) : kind === 'oil' ? ['engineOil'] : []);

/** The kind a booked sub-service points at ("Oil Change" → oil, "Full Service" → full, a fluid → fluids). */
export const kindFromSub = (sub?: string): ServiceKind => (sub === 'Full Service' ? 'full' : sub === 'Oil Change' || sub === 'Engine Oil' ? 'oil' : sub ? 'fluids' : 'full');

/** The fluid a booked sub-service names, if it names one. */
export const fluidFromSub = (sub?: string): ServiceFluid | undefined =>
  sub === 'Engine Oil' ? 'engineOil' : sub === 'Transmission Oil' ? 'transmission' : sub === 'Brake Fluid' ? 'brakeFluid' : sub === 'Power Steering Oil' ? 'powerSteering' : undefined;

const DAY = 24 * 60 * 60 * 1000;
const MONTH = 30 * DAY;

/** Usual gap to the next service, by kind: every km figure and number of months is only a starting point the garage can change. */
const INTERVALS: Record<ServiceKind, { km: number; months: number }> = {
  full: { km: 10000, months: 6 },
  oil: { km: 5000, months: 3 },
  fluids: { km: 20000, months: 12 },
};

export const nextServiceDefaults = (kind: ServiceKind, mileageKm: number, from = Date.now()) => ({
  nextServiceKm: mileageKm + INTERVALS[kind].km,
  nextServiceAt: from + INTERVALS[kind].months * MONTH,
});

/** How close the next service is: ok, soon (within 14 days or 500 km), due (today) or overdue. */
export const serviceReminder = (service: Pick<ServiceDetails, 'nextServiceAt' | 'nextServiceKm'>, now = Date.now(), currentKm?: number): { state: 'ok' | 'soon' | 'due' | 'overdue'; daysLeft?: number; kmLeft?: number } => {
  const daysLeft = service.nextServiceAt ? Math.ceil((service.nextServiceAt - now) / DAY) : undefined;
  const kmLeft = service.nextServiceKm !== undefined && currentKm !== undefined ? service.nextServiceKm - currentKm : undefined;
  if ((daysLeft !== undefined && daysLeft < 0) || (kmLeft !== undefined && kmLeft < 0)) return { state: 'overdue', daysLeft, kmLeft };
  if ((daysLeft !== undefined && daysLeft === 0) || (kmLeft !== undefined && kmLeft === 0)) return { state: 'due', daysLeft, kmLeft };
  if ((daysLeft !== undefined && daysLeft <= 14) || (kmLeft !== undefined && kmLeft <= 500)) return { state: 'soon', daysLeft, kmLeft };
  return { state: 'ok', daysLeft, kmLeft };
};
