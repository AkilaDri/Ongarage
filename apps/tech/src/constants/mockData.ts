import { newWorkshopProgress, type GarageRef, type VoiceNote } from '@ongarage/shared';
import type { EarningEntry, GarageLink, Invite, OwnerReview, TechJob, TechProfile } from '../types';

const MIN = 60 * 1000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

// The garage app's "කසුන් ජයසිංහ" (TEAM m2, hasApp): TOPCODE's auto electrician, who
// also freelances for another garage.
export const PROFILE: TechProfile = {
  id: 't-m2',
  name: 'කසුන් ජයසිංහ',
  role: 'ඔටෝ ඉලෙක්ට්‍රීෂියන්',
  phone: '0771234502',
  skills: ['Electrical', 'Batteries', 'Scan ECU', 'මාර්ග සහාය'],
  nicVerified: true,
  techCode: 'TECH-0502',
  joinedAt: Date.now() - 400 * DAY,
};

// Same garages as the garage and parts apps.
export const TOPCODE: GarageRef = { id: 'g1', name: 'TOPCODE Tuning & Service', phone: '077 123 4567', address: 'කොටුවේගොඩ පාර, ගාල්ල', coords: { latitude: 6.0412, longitude: 80.2129 }, rating: 4.9 };
export const SOUTHERN: GarageRef = { id: 'g2', name: 'Southern Auto Care', phone: '077 555 1201', address: 'කරාපිටිය, ගාල්ල', coords: { latitude: 6.0602, longitude: 80.2321 }, rating: 4.5 };
export const MATARA: GarageRef = { id: 'g3', name: 'Matara Road Motors', phone: '077 555 1202', address: 'මාතර පාර, දඩැල්ල', coords: { latitude: 6.0221, longitude: 80.2398 }, rating: 4.3 };

export const LINKS: GarageLink[] = [
  { garage: TOPCODE, kind: 'employee', rates: { sos: 1200, workshop: 1500 }, since: Date.now() - 400 * DAY, jobsDone: 214 },
  { garage: SOUTHERN, kind: 'freelance', rates: { sos: 2200, workshop: 2800 }, since: Date.now() - 60 * DAY, jobsDone: 17 },
];

export const INVITES: Invite[] = [
  {
    id: 'inv1', garage: MATARA, kind: 'freelance', rates: { sos: 2000, workshop: 2500 }, code: 'MRM-4821',
    message: 'සති අන්තවල ඉලෙක්ට්‍රිකල් රැකියා සඳහා උදව් අවශ්‍යයි.',
  },
];

const voice = (id: string, durationSec: number): VoiceNote => ({ id, durationSec });
const PHOTO = (id: string) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=900&q=80`;
/** Sample photos for the simulated camera (check-in, diagnosis, handover). */
export const SAMPLE_PHOTOS = [PHOTO('1625047509248-ec889cbff17f'), PHOTO('1517524008697-84bbe3c3fd98'), PHOTO('1503376780353-7e6692767b70')];

const tomorrowAt = (h: number) => {
  const d = new Date(Date.now() + DAY);
  d.setHours(h, 0, 0, 0);
  return d.getTime();
};

/** SOS checklist (same as the garage app's dispatch screen). */
export const SOS_TASKS = ['ස්ථානයේ පරීක්ෂා කර දෝෂය හඳුනා ගැනීම', 'අලුත්වැඩියාව / කොටස් මාරු කිරීම', 'වාහනය භාර දීමට සූදානම් කිරීම'];
export const SOS_REPAIR_TASK = 1;

// Workshop jobs: TOPCODE's bookings from the garage app (b1, b2) plus a freelance offer.
export const WORKSHOP_JOBS: TechJob[] = [
  {
    id: 'w-b1', kind: 'workshop', stage: 'assigned', garage: TOPCODE, title: 'ECU Remapping', icon: '💻',
    customer: { name: 'දිනේෂ් කුමාර', phone: '0779876507' }, vehicle: { name: 'Vitz', plate: 'CAE-1122', type: 'Hatchback' },
    location: { address: 'ගාල්ල කොටුව', coords: { latitude: 6.0272, longitude: 80.2171 } }, assignedAt: Date.now() - 3 * HOUR, pay: 1500,
    workshop: {
      scheduledAt: tomorrowAt(9), doorstep: false, parts: 'none', agreedPrice: 15500, ownerPartType: 'GarageChoice', progress: newWorkshopProgress(),
      description: 'ඉන්ධන පරිභෝජනය වැඩියි, ඇක්සලරේට් කරද්දී බර ගතියක්. ECU remap එකක් කරන්න කැමතියි.', voiceNotes: [voice('vn-b1', 21)],
    },
    tasks: [],
  },
  {
    id: 'w-b2', kind: 'workshop', stage: 'assigned', garage: TOPCODE, title: 'Battery Replacement', icon: '🔋',
    customer: { name: 'කවිෂා රත්නායක', phone: '0779876508' }, vehicle: { name: 'March K11', plate: 'WP-1029', type: 'Hatchback' },
    location: { address: 'වක්වැල්ල පාර', coords: { latitude: 6.0533, longitude: 80.2302 } }, assignedAt: Date.now() - 2 * HOUR, pay: 1500,
    workshop: {
      scheduledAt: tomorrowAt(14), doorstep: true, parts: 'arrived', agreedPrice: 8200, ownerPartType: 'Recon', progress: newWorkshopProgress(), partsSummary: 'Battery 12V 45Ah · Battery terminals (Recon, අයිතිකරු අනුමත)',
      description: 'බැටරිය බැහැලා, වාහනය පණගන්වන්න බැහැ. ගෙදරටම ඇවිත් මාරු කරන්න පුළුවන්ද?', photos: [PHOTO('1517524008697-84bbe3c3fd98')],
    },
    tasks: [],
  },
  {
    id: 'w-s1', kind: 'workshop', stage: 'offered', garage: SOUTHERN, title: 'Alternator Check', icon: '⚡',
    customer: { name: 'ශෙහාන් ගුණවර්ධන', phone: '0779876506' }, vehicle: { name: 'Axio', plate: 'CAA-3398', type: 'Sedan' },
    location: { address: 'කරාපිටිය, ගාල්ල', coords: SOUTHERN.coords }, assignedAt: Date.now() - 20 * MIN, pay: 2800,
    workshop: {
      scheduledAt: tomorrowAt(11), doorstep: false, parts: 'onTheWay', agreedPrice: 6500, ownerPartType: 'OEM', progress: newWorkshopProgress(), partsSummary: 'Alternator (OEM) · Galle Auto Parts',
      description: 'බැටරි ලයිට් එක දැල්වෙනවා, බැටරිය චාජ් වෙන්නේ නැහැ වගේ.', photos: [PHOTO('1625047509248-ec889cbff17f')], voiceNotes: [voice('vn-s1', 14)],
    },
    tasks: [],
  },
];

/** SOS jobs each garage assigns once the technician is checked in there (one at a time). */
export type SOSSeed = Omit<TechJob, 'id' | 'stage' | 'assignedAt' | 'tasks' | 'pay' | 'garage' | 'sos'> & {
  garageId: string;
  breakdownId: string;
  note?: string;
  calloutFee: number;
  quote: number;
  etaMin: number;
};
export const SOS_POOL: SOSSeed[] = [
  {
    garageId: 'g1', kind: 'sos', title: 'බැටරි ජම්ප්ස්ටාර්ට්', icon: '🔋', breakdownId: 'battery', note: 'වාහනය පණගන්නේ නැහැ, ලයිට් අඳුරුයි.',
    customer: { name: 'හිරුනි සේනානායක', phone: '0779876502' }, vehicle: { name: 'Vezel', plate: 'CAB-5510', type: 'SUV' },
    location: { address: 'කරාපිටිය, ගාල්ල', coords: { latitude: 6.0618, longitude: 80.2284 } }, calloutFee: 750, quote: 2500, etaMin: 12,
  },
  {
    garageId: 'g2', kind: 'sos', title: 'එන්ජිම රත්වීම', icon: '🌡️', breakdownId: 'overheating', note: 'ටෙම්පරේචර් මීටරය රතු පැත්තට ගියා.',
    customer: { name: 'ලහිරු බණ්ඩාර', phone: '0779876503' }, vehicle: { name: 'Alto K6A', plate: 'KV-4412', type: 'Hatchback' },
    location: { address: 'උනවටුන හන්දිය', coords: { latitude: 6.0141, longitude: 80.2468 } }, calloutFee: 500, quote: 3500, etaMin: 15,
  },
  {
    garageId: 'g3', kind: 'sos', title: 'ඉන්ධන ගෙන්වීම', icon: '⛽', breakdownId: 'fuel',
    customer: { name: 'තරිඳු සමරවීර', phone: '0779876504' }, vehicle: { name: 'Pulsar 150', plate: 'BCD-2231', type: 'Motorbike' },
    location: { address: 'මාතර පාර, දඩැල්ල', coords: { latitude: 6.0232, longitude: 80.2441 } }, calloutFee: 500, quote: 1500, etaMin: 10,
  },
];

const entry = (id: string, garage: GarageRef, title: string, icon: string, daysAgo: number, pay: number, collected: number, settled: boolean, rating?: number): EarningEntry => ({
  id, jobId: id, garageId: garage.id, garageName: garage.name, title, icon, at: Date.now() - daysAgo * DAY, pay, collected, settled, rating,
});

export const EARNINGS: EarningEntry[] = [
  entry('e1', TOPCODE, 'ටයර් පන්චර්', '🛞', 0.2, 1200, 3500, false, 5),
  entry('e2', SOUTHERN, 'Starter Motor', '⚡', 1, 2800, 0, false, 5),
  entry('e3', TOPCODE, 'Battery Replacement', '🔋', 2, 1500, 0, true, 4),
  entry('e4', TOPCODE, 'බැටරි ජම්ප්ස්ටාර්ට්', '🔋', 3, 1200, 3250, true, 5),
  entry('e5', SOUTHERN, 'Wiring Harness', '⚡', 5, 2800, 0, true, 5),
  entry('e6', TOPCODE, 'Scan ECU', '💻', 9, 1500, 0, true),
];

export const REVIEWS: OwnerReview[] = [
  { id: 'or1', customer: 'සචිනි පෙරේරා', garage: 'TOPCODE Tuning & Service', rating: 5, text: 'කසුන් ඉක්මනින් ආවා, ප්‍රශ්නය හොඳට පැහැදිලි කළා.', at: Date.now() - 0.2 * DAY },
  { id: 'or2', customer: 'නදීශා විජේසිංහ', garage: 'Southern Auto Care', rating: 5, text: 'ඉලෙක්ට්‍රිකල් දෝෂය පැයකින් හදලා දුන්නා.', at: Date.now() - 1 * DAY },
  { id: 'or3', customer: 'අමිල ප්‍රනාන්දු', garage: 'TOPCODE Tuning & Service', rating: 4, text: 'හොඳ වැඩක්, ටිකක් පරක්කු වුණා.', at: Date.now() - 2 * DAY },
];
/** Owner ratings before the seeded reviews. */
export const RATING_HISTORY = { count: 131, sum: 131 * 4.8 };

// Simulation timings (compressed so the flow can be watched end to end).
export const SOS_OFFER_AFTER_MS = 8000;
export const ACCEPT_WINDOW_MS = 90 * 1000;
export const DRIVE_MS = 15000;
export const APPROVAL_MS = 4000;
export const OWNER_CONFIRM_MS = 3000;
/** A garage approves a higher repair charge up to this share of its quote. */
export const AUTO_APPROVE_FACTOR = 1.6;
