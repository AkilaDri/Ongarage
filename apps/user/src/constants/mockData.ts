import type { Vehicle, Garage, GarageReview, ServiceCategory, Mechanic, LatLng, PickedLocation } from '@ongarage/shared';

const DAY = 24 * 60 * 60 * 1000;
const review = (id: string, customer: string, rating: number, text: string, daysAgo: number, reply?: string): GarageReview => ({
  id,
  customer,
  rating,
  text,
  at: Date.now() - daysAgo * DAY,
  reply: reply ? { text: reply, at: Date.now() - (daysAgo - 0.5) * DAY } : undefined,
});

export const DEFAULT_COORDS: LatLng = { latitude: 6.0329, longitude: 80.2168 };

export const MOCK_USER = {
  id: 'u1',
  firstName: 'Akila',
  lastName: 'Drishan',
  city: 'ගාල්ල',
  phone: '+94 77 123 4567',
};

export const MOCK_VEHICLES: Vehicle[] = [
  { id: 'premio', name: 'Premio', plate: 'CAD-8821', type: 'Sedan' },
  { id: 'alto', name: 'Alto K6A', plate: 'KV-4412', type: 'Hatchback' },
  { id: 'march', name: 'March K11', plate: 'WP-1029', type: 'Hatchback' },
  { id: 'vezel', name: 'Vezel', plate: 'CAB-5510', type: 'SUV' },
];


export const GARAGE_PHOTOS = [
  'https://images.unsplash.com/photo-1625047509248-ec889cbff17f?auto=format&fit=crop&w=300&q=80',
  'https://images.unsplash.com/photo-1517524008697-84bbe3c3fd98?auto=format&fit=crop&w=300&q=80',
  'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=300&q=80',
];

// Stand-ins for photos an owner attaches, until camera / gallery access in the native build.
export const SAMPLE_UPLOAD_PHOTOS = [
  'https://images.unsplash.com/photo-1625047509248-ec889cbff17f?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1517524008697-84bbe3c3fd98?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=900&q=80',
];

export const MOCK_GARAGES: Garage[] = [
  {
    id: '5',
    name: 'AutoTech Motors',
    level: 'premier',
    dimensions: { quality: 4.9, pricing: 4.7, onTime: 4.8, communication: 4.8 },
    recentReviews: [
      review('at1', 'Akila Drishan', 4.6, 'ඉක්මනින් කළා, පරණ ෆිල්ටරය පෙන්නුවා.', 23, 'ස්තූතියි! ඊළඟ සේවාව කි.මී. 5,000න්.'),
      review('at2', 'තරිඳු පීරිස්', 5, 'ආරක්ෂිත රැකියාවක් නිසා කිසිම කරදරයක් නැතිව කළා.', 30),
    ],
    specialization: 'Full Service & Hybrid Care',
    rating: 4.9,
    reviews: 212,
    distance: 2.6,
    status: 'open',
    phone: '077 567 8901',
    address: 'වක්වැල්ල පාර, ගාල්ල',
    coords: { latitude: 6.0533, longitude: 80.2302 },
    reviews_text: 'සියලු වැඩ ඡායාරූප සමඟ පෙන්නුවා.',
    photos: GARAGE_PHOTOS,
  },
  {
    id: '1',
    name: 'TOPCODE Tuning & Service',
    level: 'trusted',
    dimensions: { quality: 4.9, pricing: 4.6, onTime: 4.8, communication: 4.9 },
    recentReviews: [
      review('t1', 'දිනේෂ් කුමාර', 5, 'ECU error එක හරියටම හොයලා හදා දුන්නා. පරණ කොටස් පෙන්නුවා.', 3, 'ස්තූතියි දිනේෂ්! ඕනෑම වෙලාවක එන්න.'),
      review('t2', 'නදීශා විජේසිංහ', 4, 'වැඩේ හොඳයි, ටිකක් පරක්කු වුණා.', 9, 'සමාවෙන්න — කොටස් ප්‍රමාද වුණා. ඊළඟ පාර කලින් දන්වනවා.'),
    ],
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
    level: 'verified',
    dimensions: { quality: 4.8, pricing: 4.7, onTime: 4.5, communication: 4.6 },
    recentReviews: [review('a1', 'ලහිරු බණ්ඩාර', 5, 'හයිබ්‍රිඩ් බැටරි ගැටලුව ඉක්මනින් හැදුවා, මිලත් සාධාරණයි.', 5)],
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
    level: 'verified',
    dimensions: { quality: 4.7, pricing: 4.5, onTime: 4.6, communication: 4.4 },
    recentReviews: [review('l1', 'ශෙහාන් ගුණවර්ධන', 4, 'Wiring fault එක අල්ලා ගත්තා. බිල ටිකක් වැඩියි.', 7, 'අමතර පරීක්ෂාවක් කළ නිසා — රිසිට්පතේ විස්තරය තියෙනවා.')],
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
    level: 'registered',
    dimensions: { quality: 4.6, pricing: 4.4, onTime: 4.3, communication: 4.5 },
    recentReviews: [review('s1', 'කවිෂා රත්නායක', 5, 'විශ්වාසවන්ත තැනක්. ඩිස්ක් කැපී ඇති බව ඡායාරූපයෙන් පෙන්නුවා.', 12)],
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

  {
    id: '6',
    name: 'Galle Hybrid Care',
    level: 'verified',
    dimensions: { quality: 4.7, pricing: 4.8, onTime: 4.6, communication: 4.7 },
    recentReviews: [review('gh1', 'රුවිනි ද සිල්වා', 5, 'හයිබ්‍රිඩ් බැටරි පරීක්ෂාව ඉක්මනින් කළා, මිල සාධාරණයි.', 4, 'ස්තූතියි! නැවත එන්න.')],
    specialization: 'Hybrid Battery & Inverter',
    rating: 4.7,
    reviews: 18,
    distance: 1.9,
    status: 'open',
    phone: '077 678 9012',
    address: 'රිච්මන්ඩ් කන්ද, ගාල්ල',
    coords: { latitude: 6.0365, longitude: 80.2219 },
    reviews_text: 'හයිබ්‍රිඩ් බැටරි පරීක්ෂාව ඉක්මනින් කළා, මිල සාධාරණයි.',
    photos: GARAGE_PHOTOS,
  },
  {
    id: '7',
    name: 'Unawatuna Car Clinic',
    level: 'registered',
    dimensions: { quality: 4.5, pricing: 4.7, onTime: 4.4, communication: 4.6 },
    recentReviews: [review('uc1', 'තරිඳු පීරිස්', 5, 'අලුත් ගරාජයක් වුණත් වැඩේ පිළිවෙළට කළා.', 6)],
    specialization: 'General Service & AC',
    rating: 4.6,
    reviews: 9,
    distance: 4.2,
    status: 'open',
    phone: '077 789 0123',
    address: 'උනවටුන',
    coords: { latitude: 6.0128, longitude: 80.2489 },
    reviews_text: 'අලුත් ගරාජයක් වුණත් වැඩේ පිළිවෙළට කළා.',
    photos: GARAGE_PHOTOS,
  },
  {
    id: '8',
    name: 'Karapitiya Auto Spa',
    level: 'verified',
    dimensions: { quality: 4.8, pricing: 4.6, onTime: 4.7, communication: 4.8 },
    recentReviews: [review('ka1', 'ඉෂාරා සමරවීර', 5, 'ඇතුළත ඩීටේලින් එක ඉතා හොඳයි.', 3, 'ඔබේ ප්‍රතිචාරයට ස්තූතියි!')],
    specialization: 'Wash, Detailing & Paint',
    rating: 4.8,
    reviews: 41,
    distance: 2.8,
    status: 'open',
    phone: '077 890 1234',
    address: 'කරාපිටිය, ගාල්ල',
    coords: { latitude: 6.0588, longitude: 80.2305 },
    reviews_text: 'ඇතුළත ඩීටේලින් එක ඉතා හොඳයි.',
    photos: GARAGE_PHOTOS,
  },
  {
    id: '9',
    name: 'Southern Tyre & Align',
    level: 'trusted',
    dimensions: { quality: 4.9, pricing: 4.7, onTime: 4.8, communication: 4.7 },
    recentReviews: [review('st1', 'නුවන් ජයවර්ධන', 5, 'වීල් ඇලයින්මන්ට් එක හරියටම කළා, ඉක්මනින්.', 8)],
    specialization: 'Tyres, Alignment & Brakes',
    rating: 4.9,
    reviews: 156,
    distance: 3.1,
    status: 'open',
    phone: '077 901 2345',
    address: 'මාතර පාර, ගාල්ල',
    coords: { latitude: 6.0301, longitude: 80.2352 },
    reviews_text: 'වීල් ඇලයින්මන්ට් එක හරියටම කළා, ඉක්මනින්.',
    photos: GARAGE_PHOTOS,
  },
];

/** The garage of the seeded direct booking (brake job) — looked up by id, not position. */
export const SPEED_WORKS = MOCK_GARAGES.find((g) => g.id === '4')!;

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
