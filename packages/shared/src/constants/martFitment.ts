// Which vehicles a stock line fits and its part number. Simulated here (a shop's own app will publish the real
// fitment list); derived from the part's name, type and brand so a line always shows the same numbers.

export type Fit = { make: string; models: string[]; from: number; to: number };

const FAMILIES: Fit[] = [
  { make: 'Toyota', models: ['Axio', 'Allion', 'Premio', 'Vitz', 'Aqua', 'Prius'], from: 2006, to: 2020 },
  { make: 'Honda', models: ['Fit', 'Vezel', 'Civic', 'Grace'], from: 2007, to: 2021 },
  { make: 'Suzuki', models: ['Alto', 'Wagon R', 'Swift'], from: 2008, to: 2022 },
  { make: 'Nissan', models: ['March', 'Leaf', 'Sunny'], from: 2005, to: 2019 },
  { make: 'Mitsubishi', models: ['Lancer', 'Montero'], from: 2004, to: 2016 },
];

export const FITMENT_MAKES = FAMILIES.map((f) => f.make);

const hash = (s: string) => [...s].reduce((n, ch) => (n * 31 + ch.charCodeAt(0)) >>> 0, 7);

export const fitmentFor = (name: string, partType: string, brand?: string): { partNo: string; fits: Fit[] } => {
  const h = hash(`${name}|${partType}|${brand ?? ''}`);
  // A maker's own (genuine) part fits that maker only; the rest fit two to four makes.
  const own = FAMILIES.find((f) => f.make === brand);
  const picked = own ? [own] : FAMILIES.filter((_, i) => (h >> i) % 3 !== 0).slice(0, 4);
  const pool = picked.length >= 2 || own ? picked : FAMILIES.slice(0, 2);
  const fits = pool.map((f, i) => {
    const from = f.from + ((h >> (i + 2)) % 4);
    const to = Math.max(from + 3, f.to - ((h >> (i + 5)) % 3));
    const count = Math.max(2, f.models.length - ((h >> (i + 1)) % 2));
    return { make: f.make, models: f.models.slice(0, count), from, to };
  });
  const prefix = (brand ?? partType).replace(/[^A-Za-z]/g, '').slice(0, 3).toUpperCase() || 'GEN';
  const partNo = `${prefix}-${String(10000 + (h % 89999))}-${String(h % 97).padStart(2, '0')}`;
  return { partNo, fits };
};

/** True when a part number matches what the owner typed (case, dashes and spaces ignored). */
export const partNoMatches = (partNo: string | undefined, typed: string) => {
  const clean = (s: string) => s.toUpperCase().replace(/[^A-Z0-9]/g, '');
  const t = clean(typed);
  return !t || clean(partNo ?? '').includes(t);
};

/** True when any fitment entry covers the chosen make / model / year (blank filters match everything). */
export const fitsVehicle = (fits: Fit[] | undefined, make: string, model: string, year: number | null) =>
  !make && !model && year === null
    ? true
    : (fits ?? []).some((f) => (!make || f.make === make) && (!model || f.models.includes(model)) && (year === null || (year >= f.from && year <= f.to)));

/**
 * How sure we are a line fits the chosen vehicle: 'fits' (listed for it, or no vehicle chosen), 'unknown' (the shop has
 * not listed any fitment for the line, so it must be confirmed with the shop) or 'no' (listed, but not for this vehicle).
 */
export const fitStatus = (fits: Fit[] | undefined, make: string, model: string, year: number | null): 'fits' | 'unknown' | 'no' => {
  if (!make && !model && year === null) return 'fits';
  if (!fits || fits.length === 0) return 'unknown';
  return fitsVehicle(fits, make, model, year) ? 'fits' : 'no';
};

/** True when the typed part number equals the line's number (case, dashes and spaces ignored). */
export const partNoExact = (partNo: string | undefined, typed: string) => {
  const clean = (s: string) => s.toUpperCase().replace(/[^A-Z0-9]/g, '');
  return !!partNo && !!clean(typed) && clean(partNo) === clean(typed);
};
