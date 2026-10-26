import type { Amenity, Place } from '@ongarage/shared';

/**
 * Demo stations and chargers around Galle until a backend (or a places service) supplies them. The model and the filters are in `@ongarage/shared`
 * (`marketplace/places`). Fuel prices here are sample figures, not the official ones.
 */
const fuel = (p: Omit<Place, 'kind'>): Place => ({ ...p, kind: 'fuel' });
const ev = (p: Omit<Place, 'kind'>): Place => ({ ...p, kind: 'ev' });
const A = (...a: Amenity[]): Amenity[] => a;

export const PLACES: Place[] = [
  fuel({
    id: 'f1', name: 'Ceypetco · ගාල්ල ප්‍රධාන', brand: 'Ceypetco', coords: { latitude: 6.0359, longitude: 80.2163 }, address: 'මාතර පාර, ගාල්ල', phone: '091 223 4411', open24: true, open: true,
    services: ['Petrol', 'Diesel', 'Tyre Air Check', 'Oil Top-up', 'Coolant Top-up'], amenities: A('Mini Mart', 'ATM', 'Toilet', 'Air'),
    fuels: [{ name: 'Petrol 92', price: 305, stock: 'available' }, { name: 'Petrol 95', price: 355, stock: 'low' }, { name: 'Auto Diesel', price: 285, stock: 'available' }, { name: 'Super Diesel', price: 335, stock: 'available' }],
  }),
  fuel({
    id: 'f2', name: 'IOC · කරාපිටිය', brand: 'IOC', coords: { latitude: 6.0558, longitude: 80.2241 }, address: 'කරාපිටිය පාර, ගාල්ල', phone: '091 222 7820', open24: false, hours: '5.30 - 22.00', open: true,
    services: ['Petrol', 'Diesel', 'Tyre Air Check', 'Quick Wash'], amenities: A('Car Wash', 'ATM', 'Air'),
    fuels: [{ name: 'Petrol 92', price: 305, stock: 'available' }, { name: 'Auto Diesel', price: 285, stock: 'out' }, { name: 'Super Diesel', price: 335, stock: 'low' }],
  }),
  fuel({
    id: 'f3', name: 'Sinopec · උණවටුන', brand: 'Sinopec', coords: { latitude: 6.0187, longitude: 80.2503 }, address: 'උණවටුන, ගාල්ල', phone: '091 228 3340', open24: true, open: true,
    services: ['Petrol', 'Diesel', 'Oil Top-up', 'Coolant Top-up', 'Quick Wash'], amenities: A('Car Wash', 'Tyre Shop', 'Mini Mart', 'Toilet'),
    fuels: [{ name: 'Petrol 92', price: 305, stock: 'available' }, { name: 'Petrol 95', price: 355, stock: 'available' }, { name: 'Auto Diesel', price: 285, stock: 'available' }],
  }),
  fuel({
    id: 'f4', name: 'Ceypetco · හික්කඩුව පාර', brand: 'Ceypetco', coords: { latitude: 6.0689, longitude: 80.1912 }, address: 'හික්කඩුව පාර', phone: '091 224 5509', open24: false, hours: '6.00 - 21.00', open: false,
    services: ['Petrol', 'Diesel', 'Tyre Air Check'], amenities: A('Air'),
    fuels: [{ name: 'Petrol 92', price: 305, stock: 'available' }, { name: 'Auto Diesel', price: 285, stock: 'available' }],
  }),
  fuel({
    id: 'f5', name: 'LIOC · වක්වැල්ල', brand: 'LIOC', coords: { latitude: 6.0612, longitude: 80.2437 }, address: 'වක්වැල්ල පාර', phone: '091 227 1180', open24: false, hours: '6.00 - 22.00', open: true,
    services: ['Petrol', 'Diesel', 'Tyre Air Check', 'Oil Top-up', 'Quick Wash'], amenities: A('Car Wash', 'Tyre Shop', 'Mini Mart', 'ATM'),
    fuels: [{ name: 'Petrol 92', price: 305, stock: 'low' }, { name: 'Petrol 95', price: 355, stock: 'available' }, { name: 'Auto Diesel', price: 285, stock: 'available' }],
  }),
  ev({
    id: 'e1', name: 'Galle Fort EV Hub', brand: 'GreenCharge', coords: { latitude: 6.0306, longitude: 80.2174 }, address: 'ගාල්ල කොටුව ළඟ', phone: '077 410 5522', open24: true, open: true,
    services: ['AC Charging Port', 'DC Fast Charging'], amenities: A('Mini Mart', 'ATM'),
    connectors: [{ type: 'CCS2', kw: 60, price: 110, states: ['free', 'free', 'busy'] }, { type: 'Type 2', kw: 22, price: 78, states: ['free', 'busy'] }],
  }),
  ev({
    id: 'e2', name: 'Karapitiya Plug Point', brand: 'ChargeLK', coords: { latitude: 6.0541, longitude: 80.2262 }, address: 'කරාපිටිය රෝහල ළඟ', phone: '071 330 4411', open24: false, hours: '7.00 - 21.00', open: true,
    services: ['AC Charging Port'], amenities: A('Mini Mart'),
    connectors: [{ type: 'Type 2', kw: 11, price: 65, states: ['busy', 'busy'] }],
  }),
  ev({
    id: 'e3', name: 'Unawatuna Fast Charge', brand: 'GreenCharge', coords: { latitude: 6.0119, longitude: 80.2495 }, address: 'උණවටුන ප්‍රධාන පාර', phone: '077 410 6603', open24: true, open: true,
    services: ['AC Charging Port', 'DC Fast Charging'], amenities: A('Car Wash', 'Mini Mart'),
    connectors: [{ type: 'CCS2', kw: 120, price: 135, states: ['free', 'busy'] }, { type: 'CHAdeMO', kw: 50, price: 120, states: ['free'] }],
  }),
  ev({
    id: 'e4', name: 'Wakwella Road Charger', brand: 'ChargeLK', coords: { latitude: 6.0577, longitude: 80.2371 }, address: 'වක්වැල්ල පාර', phone: '071 330 7790', open24: false, hours: '8.00 - 20.00', open: false,
    services: ['AC Charging Port'], amenities: A(),
    connectors: [{ type: 'Type 2', kw: 7, price: 55, states: ['offline'] }],
  }),
];

/** The places of a category: fuel stations for Fuel Station (id 16), chargers for EV Charging (id 13). */
export const placesOfCategory = (categoryId: string): Place[] => PLACES.filter((p) => (categoryId === '16' ? p.kind === 'fuel' : categoryId === '13' ? p.kind === 'ev' : false));

/** The colour and short mark of a brand's badge (real brand logos can replace these when the artwork is supplied). */
export const BRAND_BADGE: Record<string, { color: string; mark: string }> = {
  Ceypetco: { color: '#0f8a4b', mark: 'CPC' },
  IOC: { color: '#f26a1b', mark: 'IOC' },
  LIOC: { color: '#f26a1b', mark: 'LIOC' },
  Sinopec: { color: '#d4202c', mark: 'SIN' },
  GreenCharge: { color: '#16a34a', mark: 'GC' },
  ChargeLK: { color: '#2563eb', mark: 'CLK' },
};

export const AMENITY_ICON: Record<Amenity, string> = { 'Car Wash': '🚿', 'Tyre Shop': '🛞', 'Mini Mart': '🛒', ATM: '🏧', Toilet: '🚻', Air: '💨' };
export const AMENITY_LABEL: Record<Amenity, string> = { 'Car Wash': 'Car Wash', 'Tyre Shop': 'Tyre Shop', 'Mini Mart': 'Mini Mart', ATM: 'ATM', Toilet: 'වැසිකිළි', Air: 'වාතය' };
