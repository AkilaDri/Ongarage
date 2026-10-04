import type { Vehicle, Garage, ServiceCategory, Mechanic, LatLng, PickedLocation } from '@ongarage/shared';

export const DEFAULT_COORDS: LatLng = { latitude: 6.0329, longitude: 80.2168 };

export const MOCK_USER = {
  id: 'u1',
  firstName: 'Akila',
  lastName: 'Drishan',
  city: 'ගාල්ල',
  phone: '+94 77 123 4567',
};

export type ServiceRecord = {
  id: string;
  icon: string;
  title: string;
  garage: string;
  vehicleId: string;
  date: string;
  price: number;
};

export const MOCK_SERVICE_HISTORY: ServiceRecord[] = [
  { id: 'h1', icon: '🛢️', title: 'සම්පූර්ණ සින්තටික් ඔයිල් මාරුව', garage: 'AutoTech Motors', vehicleId: 'premio', date: '2026-09-12', price: 14500 },
  { id: 'h2', icon: '🛑', title: 'ඉදිරි බ්‍රේක් පෑඩ් මාරු කිරීම', garage: 'City Brake Center', vehicleId: 'premio', date: '2026-08-05', price: 8200 },
];

export const MOCK_VEHICLES: Vehicle[] = [
  { id: 'premio', name: 'Premio', plate: 'CAD-8821', type: 'Sedan' },
  { id: 'alto', name: 'Alto K6A', plate: 'KV-4412', type: 'Hatchback' },
  { id: 'march', name: 'March K11', plate: 'WP-1029', type: 'Hatchback' },
  { id: 'vezel', name: 'Vezel', plate: 'CAB-5510', type: 'SUV' },
];


export const GARAGE_PHOTOS = [
  'https://images.unsplash.com/photo-1486006920555-c77dce18193b?auto=format&fit=crop&w=300&q=80',
  'https://images.unsplash.com/photo-1517524008697-84bbe3c3fd98?auto=format&fit=crop&w=300&q=80',
  'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=300&q=80',
];

export const MOCK_GARAGES: Garage[] = [
  {
    id: '1',
    name: 'TOPCODE Tuning & Service',
    specialization: 'ECU Remapping & Performance',
    rating: 5.0,
    reviews: 89,
    distance: 0.8,
    status: 'open',
    phone: '077 123 4567',
    address: 'කොටුවේගොඩ පාර, ගාල්ල',
    coords: { latitude: 6.0412, longitude: 80.2129 },
    reviews_text: 'මගේ වාහනයේ තිබුණු pickup අඩුපාඩුව සහ ECU error එක හරියටම හොයලා හදා දුන්නා.',
    photos: GARAGE_PHOTOS,
  },
  {
    id: '2',
    name: 'Apex Motors & Hybrid Hub',
    specialization: 'Hybrid Inverter & ABS Repairs',
    rating: 4.9,
    reviews: 124,
    distance: 1.2,
    status: 'open',
    phone: '077 234 5678',
    address: 'ප්‍රධාන වීදිය, ගාල්ල කොටුව',
    coords: { latitude: 6.0272, longitude: 80.2171 },
    reviews_text: 'හයිබ්‍රිඩ් බැටරි ගැටළුවට හොඳම විසඳුම ඉක්මනින්ම දුන්නා.',
    photos: GARAGE_PHOTOS,
  },
  {
    id: '3',
    name: 'Lanka Auto Diagnostics',
    specialization: 'Advanced Scan & Wiring',
    rating: 4.8,
    reviews: 76,
    distance: 1.5,
    status: 'open',
    phone: '077 345 6789',
    address: 'මාතර පාර, උනවටුන',
    coords: { latitude: 6.0213, longitude: 80.2398 },
    reviews_text: 'වාහනයේ තිබුණු intermittent wiring fault එක හරියටම අල්ලා ගත්තා.',
    photos: GARAGE_PHOTOS,
  },
  {
    id: '4',
    name: 'Speed Works Garage',
    specialization: 'Engine Overhaul & Tuning',
    rating: 4.8,
    reviews: 95,
    distance: 2.1,
    status: 'open',
    phone: '077 456 7890',
    address: 'බද්දේගම පාර, අම්බලන්ගොඩ',
    coords: { latitude: 6.0489, longitude: 80.1987 },
    reviews_text: 'ඉතාම දක්ෂ යාන්ත්‍රිකයන් පිරිසක් ඉන්න විශ්වාසවන්ත තැනක්.',
    photos: GARAGE_PHOTOS,
  },
];

export const MOCK_MECHANICS: Mechanic[] = [
  {
    id: '1',
    name: 'TopCode Mobile Roadside',
    distance: 0.8,
    eta: 3,
    phone: '077 123 4567',
    specialty: 'Emergency Roadside',
    callMessage: 'TopCode හදිසි ඇමතුම සම්බන්ධ කරමින් පවතී: 077 123 4567',
    coords: { latitude: 6.0398, longitude: 80.2141 },
  },
  {
    id: '2',
    name: 'Speedy Rescue Galle',
    distance: 1.5,
    eta: 6,
    phone: '077 234 5678',
    specialty: 'Towing & Recovery',
    callMessage: 'Speedy Rescue වෙත ඇමතුමක් ලබා දෙයි',
    coords: { latitude: 6.0455, longitude: 80.2285 },
  },
];

export const LOCATION_SUGGESTIONS: PickedLocation[] = [
  { address: 'කොටුවේගොඩ පාර, ගාල්ල', coords: { latitude: 6.0412, longitude: 80.2129 } },
  { address: 'ප්‍රධාන වීදිය, ගාල්ල කොටුව', coords: { latitude: 6.0272, longitude: 80.2171 } },
  { address: 'මාතර පාර, උනවටුන', coords: { latitude: 6.0213, longitude: 80.2398 } },
  { address: 'බද්දේගම පාර, අම්බලන්ගොඩ', coords: { latitude: 6.0489, longitude: 80.1987 } },
];
