import { VEHICLE_REGISTRY } from './vehicleRegistry';
import { makePayment, newWorkshopProgress, promiseAt, type BreakdownId, type CustomerRating, type CustomerTag, type JobPayment, type LevelId } from '@ongarage/shared';
import type { GarageInquiry, Booking, Customer, CustomerVehicle, DirectRequest, FeedJob, GarageProfile, Review, ServiceVan, TeamMember } from '../types';

const MIN = 60 * 1000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

export const GARAGE: GarageProfile = {
  id: 'g-topcode',
  name: 'TOPCODE Tuning & Service',
  specialization: 'ECU Remapping & Performance',
  phone: '077 123 4567',
  address: 'කොටුවේගොඩ පාර, ගාල්ල',
  coords: { latitude: 6.0412, longitude: 80.2129 },
  openHours: 'පෙ.ව. 8:00 – ප.ව. 6:00',
  photos: [
    'https://images.unsplash.com/photo-1625047509248-ec889cbff17f?auto=format&fit=crop&w=300&q=80',
    'https://images.unsplash.com/photo-1517524008697-84bbe3c3fd98?auto=format&fit=crop&w=300&q=80',
    'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=300&q=80',
  ],
  services: ['1', '2', '5', '7', '10', '11', '15'],
  coverageKm: 5,
};

export const TEAM: TeamMember[] = [
  { id: 'm1', name: 'රොෂාන් පෙරේරා', role: 'ප්‍රධාන යාන්ත්‍රික', phone: '0771234501', hasApp: true },
  // The technician app's user (apps/tech).
  { id: 'm2', name: 'කසුන් ජයසිංහ', role: 'ඔටෝ ඉලෙක්ට්‍රීෂියන්', phone: '0771234502', hasApp: true },
  { id: 'm3', name: 'නිමල් සිල්වා', role: 'මාර්ග සහාය', phone: '0771234503' },
];

export const MEMBER_ROLES = ['ප්‍රධාන යාන්ත්‍රික', 'යාන්ත්‍රික', 'ඔටෝ ඉලෙක්ට්‍රීෂියන්', 'මාර්ග සහාය', 'ආධුනික'];

export const VANS: ServiceVan[] = [
  { id: 'v1', name: 'Toyota Hiace සේවා වෑන්', plate: 'SP-PH-4521' },
  { id: 'v2', name: 'Nissan Caravan මෙවලම් ට්‍රක්', plate: 'SP-LG-7790' },
];

const dims = (quality: number, pricing: number, onTime: number, communication: number) => ({ quality, pricing, onTime, communication });

export const REVIEWS: Review[] = [
  { id: 'r1', customer: 'දිනේෂ් කුමාර', rating: 5, dimensions: dims(5, 5, 5, 5), text: 'pickup අඩුපාඩුව සහ ECU error එක හරියටම හොයලා හදා දුන්නා.', at: Date.now() - 2 * DAY },
  { id: 'r2', customer: 'සචිනි පෙරේරා', rating: 5, dimensions: dims(5, 5, 5, 5), text: 'මාර්ගයේ නතර වුණාම විනාඩි 10න් ආවා. ඉතා හොඳ සේවාවක්.', at: Date.now() - 5 * DAY },
  { id: 'r3', customer: 'අමිල ප්‍රනාන්දු', rating: 4, dimensions: dims(5, 4, 3, 4), text: 'හොඳ වැඩක්, නමුත් කොටස් ගෙන්වීමට දිනයක් ගත වුණා.', at: Date.now() - 9 * DAY },
  {
    id: 'r4', customer: 'කවිෂා රත්නායක', rating: 3, dimensions: dims(4, 4, 2, 3), text: 'වැඩේ හොඳයි, හැබැයි කියපු වෙලාවට වඩා පැය දෙකක් පරක්කු වුණා.', at: Date.now() - 14 * DAY,
    reply: { text: 'සමාවෙන්න, එදා කොටස් සැපයුම්කරු ප්‍රමාද වුණා. ඊළඟ වතාවේ කලින්ම දැනුම් දෙන්නම්.', at: Date.now() - 13 * DAY },
  },
  { id: 'r5', customer: 'ලහිරු බණ්ඩාර', rating: 5, dimensions: dims(5, 5, 4, 5), text: 'මිල සාධාරණයි, කරපු දේ හොඳට පැහැදිලි කළා.', at: Date.now() - 20 * DAY },
];

/**
 * Everything before the seeded reviews and bookings that the trust score and level use
 * (a backend would keep these): per-dimension rating totals, jobs and disputes, and the
 * level the garage holds today.
 */
export const TRUST_HISTORY = {
  ratings: {
    quality: { sum: 81 * 4.9, count: 81 },
    pricing: { sum: 81 * 4.75, count: 81 },
    onTime: { sum: 81 * 4.6, count: 81 },
    communication: { sum: 81 * 4.8, count: 81 },
  },
  jobsAccepted: 72,
  jobsClosed: 68,
  disputes: 1,
  onTimeJobs: 61,
  monthsOnApp: 7,
  documents: true,
  subscribed: false,
  heldLevel: 'trusted' as LevelId,
};

/**
 * Fair-share monitoring (runs on the back end; the admin app approves flags): TOPCODE takes
 * a large share of local ECU work and earns over the threshold, so after the 30-day notice
 * its daily intake is limited. Earnings also price its subscription band.
 */
export const FAIRNESS_SEED = {
  stats: { areaShareByCategory: { '5': 0.31, '1': 0.14, '7': 0.09 }, avgMonthlyEarnings: 520000, monthsObserved: 4 },
  flaggedAt: Date.now() - 40 * DAY,
  /** Won through the app earlier this month (before the seeded bookings). */
  monthWonBefore: 168000,
};

/** Totals of all ratings before the seeded reviews (keeps the profile numbers realistic). */
export const RATING_HISTORY = { count: 86, sum: 86 * 4.9 };

const c = (name: string, phone: string): Customer => ({ name, phone });
const v = (name: string, plate: string, type: string): CustomerVehicle => ({ name, plate, type, ...VEHICLE_REGISTRY[plate] });

// Owners' SOS broadcasts, placed relative to the garage (km, compass bearing).
export const SOS_POOL: {
  customer: Customer;
  vehicle: CustomerVehicle;
  breakdownId: BreakdownId;
  note?: string;
  address: string;
  km: number;
  bearing: number;
  calloutFee: number;
}[] = [
  { customer: c('අකිල ද්‍රිශාන්', '0779876501'), vehicle: v('Premio', 'CAD-8821', 'Sedan'), breakdownId: 'tire', note: 'පසු දකුණු ටයරය සම්පූර්ණයෙන්ම බැස්සා.', address: 'ගාලු පාර, රිච්මන්ඩ් කන්ද', km: 1.4, bearing: 120, calloutFee: 500 },
  { customer: c('හිරුනි සේනානායක', '0779876502'), vehicle: v('Vezel', 'CAB-5510', 'SUV'), breakdownId: 'battery', note: 'වාහනය පණගන්නේ නැහැ, ලයිට් අඳුරුයි.', address: 'කරාපිටිය, ගාල්ල', km: 2.6, bearing: 60, calloutFee: 750 },
  { customer: c('ලහිරු බණ්ඩාර', '0779876503'), vehicle: v('Alto K6A', 'KV-4412', 'Hatchback'), breakdownId: 'overheating', address: 'උනවටුන හන්දිය', km: 3.1, bearing: 150, calloutFee: 500 },
  { customer: c('තරිඳු සමරවීර', '0779876504'), vehicle: v('Pulsar 150', 'BCD-2231', 'Motorbike'), breakdownId: 'fuel', address: 'මාතර පාර, දඩැල්ල', km: 1.9, bearing: 300, calloutFee: 500 },
  { customer: c('නදීශා විජේසිංහ', '0779876505'), vehicle: v('Aqua', 'CBD-7712', 'Hatchback'), breakdownId: 'mechanical', note: 'ධාවනය කරමින් සිටියදී එන්ජිම නතර වුණා.', address: 'බද්දේගම පාර, ගාල්ල', km: 3.8, bearing: 20, calloutFee: 1000 },
];

// Stand-ins for the photos owners attach to a job until uploads exist.
const PHOTO = (id: string) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=900&q=80`;
export const JOB_PHOTOS = [PHOTO('1625047509248-ec889cbff17f'), PHOTO('1517524008697-84bbe3c3fd98'), PHOTO('1503376780353-7e6692767b70')];
/** The sample photos OnMart forms attach (until the camera is wired). */
export const SAMPLE_UPLOAD_PHOTOS = JOB_PHOTOS;
const voice = (id: string, durationSec: number) => ({ id, durationSec });

// Owners' posted repair jobs (owner app: PostJobScreen), relative to the garage.
type FeedSeed = Omit<FeedJob, 'id' | 'postedAt' | 'location' | 'distanceKm'> & { address: string; km: number; bearing: number; postedMinAgo: number };

// What other garages have already found about some customers (a backend would keep this): their payment records and the ratings garages gave. Keyed by phone.
// Inquiries customers sent this garage from its card before booking it: one is waiting, one arrives a little later (see GarageContext).
export const INQUIRIES: GarageInquiry[] = [
  { id: 'i1', customer: { name: 'සුනිල් ප්‍රනාන්දු', phone: '0779876517' }, vehicle: { name: 'Axio', plate: 'CAA-3398', type: 'Sedan' }, categoryId: '7', service: 'Brake Pads', text: 'ඉදිරිපස බ්‍රේක් පෑඩ් මාරු කිරීමට මිල කීයද? හෙට දවසේ කළ හැකිද?', at: Date.now() - 35 * 60 * 1000 },
];
export const arrivingInquiry = (): GarageInquiry => ({ id: 'i2', customer: { name: 'නිමල් රණසිංහ', phone: '0779876518' }, vehicle: { name: 'Vitz', plate: 'CAE-1122', type: 'Hatchback' }, categoryId: '11', service: 'Battery Replacement', text: 'බැටරිය මාරු කරන්න ගෙදරටම එන්න පුළුවන්ද? මිල කීයද?', at: Date.now() });

const rated = (garage: string, stars: number, tags: CustomerTag[], daysAgo: number, note?: string): CustomerRating => ({ id: `cr-${garage}-${daysAgo}`, jobId: `old-${garage}-${daysAgo}`, garage, stars, tags, note, at: Date.now() - daysAgo * DAY });
const owing = (total: number, received: number, closedDaysAgo: number, promisedDaysAgo: number): JobPayment => ({ ...makePayment(total, received, { promisedAt: promiseAt(-promisedDaysAgo), now: Date.now() - closedDaysAgo * DAY }), confirm: 'confirmed' });
const paidFull = (total: number, missed = 0): JobPayment => ({ ...makePayment(total, total, { now: Date.now() - 30 * DAY }), missedCount: missed || undefined });
export const CUSTOMER_HISTORY: Record<string, { ratings: CustomerRating[]; payments: JobPayment[] }> = {
  // Did not pay balances on two jobs.
  '0779876503': { ratings: [rated('A', 1, ['unpaid'], 40, 'ඉතිරි මුදල ගෙව්වේ නැහැ.'), rated('B', 2, ['unpaid', 'rude'], 20)], payments: [owing(9000, 2000, 30, 20), owing(4500, 0, 18, 10)] },
  // Paid late once.
  '0779876505': { ratings: [rated('C', 3, ['paidLate'], 60)], payments: [paidFull(6000, 1)] },
  // Reliable.
  '0779876501': { ratings: [rated('D', 5, ['paidOnTime', 'polite'], 90), rated('E', 5, ['paidOnTime', 'onTime'], 45)], payments: [paidFull(8000), paidFull(3500), paidFull(12000)] },
};

export const FEED_POOL: FeedSeed[] = [
  {
    categoryId: '1', description: 'එන්ජිමෙන් ගැටෙන ශබ්දයක් ඇසේ, විශේෂයෙන් ධාවනය කරන විට.',
    buddySummary: 'යාන්ත්‍රික හෝ සස්පෙන්ෂන් දෝෂයක් විය හැක.', customer: c('අකිල ද්‍රිශාන්', '0779876501'),
    vehicle: v('Premio', 'CAD-8821', 'Sedan'), sparePart: 'Genuine', doorstep: false, biddingHours: 12,
    otherBids: 2, address: 'ගාල්ල නගරය', km: 1.2, bearing: 200, postedMinAgo: 15,
    photos: JOB_PHOTOS, voiceNotes: [voice('vn1', 18), voice('vn2', 7)],
  },
  {
    categoryId: '7', description: 'බ්‍රේක් තද කරන විට කෑගසන ශබ්දයක් ඇසේ.', customer: c('ලහිරු බණ්ඩාර', '0779876503'),
    vehicle: v('Alto K6A', 'KV-4412', 'Hatchback'), sparePart: 'OEM', doorstep: true, biddingHours: 6,
    otherBids: 0, address: 'උනවටුන', km: 3.0, bearing: 140, postedMinAgo: 2, republished: true,
    voiceNotes: [voice('vn3', 24)],
  },
  {
    categoryId: '2', description: 'ඩෑෂ්බෝඩ් ලයිට් නිවි නිවී දැල්වේ, ඇතැම් විට වාහනය පණගැන්වීම අපහසුයි.',
    buddySummary: 'බැටරි හෝ චාජින් පද්ධතියේ දෝෂයක් විය හැක.', customer: c('හිරුනි සේනානායක', '0779876502'),
    vehicle: v('Vezel', 'CAB-5510', 'SUV'), sparePart: 'GarageChoice', doorstep: false, biddingHours: 24,
    otherBids: 1, address: 'කරාපිටිය', km: 2.4, bearing: 70, postedMinAgo: 40,
    photos: [JOB_PHOTOS[2], JOB_PHOTOS[0]],
  },
  {
    categoryId: '5', description: 'Check engine ලයිට් දැල්වී ඇත. ස්කෑන් කර දෝෂය හඳුනා ගැනීමට අවශ්‍යයි.', customer: c('නදීශා විජේසිංහ', '0779876505'),
    vehicle: v('Aqua', 'CBD-7712', 'Hatchback'), sparePart: 'GarageChoice', doorstep: true, biddingHours: 8,
    otherBids: 3, address: 'බද්දේගම පාර', km: 3.6, bearing: 25, postedMinAgo: 70, republished: true,
  },
  {
    categoryId: '4', description: 'වායු සමීකරණය (A/C) සීතල හුළඟ ලබා නොදේ.', customer: c('ශෙහාන් ගුණවර්ධන', '0779876506'),
    vehicle: v('Axio', 'CAA-3398', 'Sedan'), sparePart: 'OEM', doorstep: false, biddingHours: 24,
    otherBids: 1, address: 'හික්කඩුව පාර', km: 4.5, bearing: 320, postedMinAgo: 25,
  },
  // Index 5: a far job nobody near has picked up (the garage adds a travel fee to bid on it).
  {
    categoryId: '1', description: 'ගියර් මාරු කරන විට ශබ්දයක් ඇසේ, ක්ලච් එක බරයි.', customer: c('සමන් කුමාර', '0779876507'),
    vehicle: v('Fit', 'CAF-1204', 'Hatchback'), sparePart: 'GarageChoice', doorstep: false, biddingHours: 12,
    otherBids: 0, address: 'මාතර නගරය', km: 18.5, bearing: 100, postedMinAgo: 30,
  },
  // Index 6: a parts-fitting job — the owner bought the part and asks a garage to fit it.
  {
    categoryId: '15', description: 'OnMart එකෙන් ගත් බ්‍රේක් පෑඩ් සෙට් එක ඉදිරිපස සවි කරන්න.', customer: c('දිලිනි ප්‍රනාන්දු', '0779876516'),
    vehicle: v('Vitz', 'CAE-1122', 'Hatchback'), sparePart: 'GarageChoice', doorstep: false, biddingHours: 8,
    otherBids: 0, address: 'ගාල්ල කොටුව', km: 2.2, bearing: 40, postedMinAgo: 12,
    fitting: { partName: 'Brake pads (front)', supply: 'owner' },
  },
];

const tomorrowAt = (h: number) => {
  const d = new Date(Date.now() + DAY);
  d.setHours(h, 0, 0, 0);
  return d.getTime();
};

// What the owner sent for each seeded booking, so the booked job can be reviewed.
const bookedJob = (
  id: string,
  categoryId: string,
  description: string,
  customer: Customer,
  vehicle: CustomerVehicle,
  address: string,
  coords: { latitude: number; longitude: number },
  distanceKm: number,
  doorstep: boolean,
  extra: Partial<Pick<FeedJob, 'photos' | 'voiceNotes' | 'buddySummary' | 'sparePart'>> = {}
) => ({ id, categoryId, description, customer, vehicle, sparePart: 'GarageChoice' as const, doorstep, location: { address, coords }, distanceKm, ...extra });

export const BOOKINGS: Booking[] = [
  {
    id: 'b1', source: 'bid', title: 'ECU Remapping', icon: '💻', customer: c('දිනේෂ් කුමාර', '0779876507'),
    vehicle: v('Vitz', 'CAE-1122', 'Hatchback'), address: 'ගාල්ල කොටුව', coords: { latitude: 6.0272, longitude: 80.2171 },
    doorstep: false, scheduledAt: tomorrowAt(9), price: 15500, status: 'scheduled', locationSharedAt: Date.now() - 3 * HOUR,
    progress: newWorkshopProgress(), warrantyMonths: 3, assignedTechId: 'm2',
    note: 'වාහනය උදේ 8:45 ට පමණ ගෙනෙන්න.',
    job: bookedJob('job-b1', '5', 'ඉන්ධන පරිභෝජනය වැඩියි, ඇක්සලරේට් කරද්දී බර ගතියක්. ECU remap එකක් කරන්න කැමතියි.', c('දිනේෂ් කුමාර', '0779876507'),
      v('Vitz', 'CAE-1122', 'Hatchback'), 'ගාල්ල කොටුව', { latitude: 6.0272, longitude: 80.2171 }, 1.6, false, { voiceNotes: [voice('vn-b1', 21)] }),
  },
  {
    id: 'b2', source: 'bid', title: 'Battery Replacement', icon: '🔋', customer: c('කවිෂා රත්නායක', '0779876508'),
    vehicle: v('March K11', 'WP-1029', 'Hatchback'), address: 'වක්වැල්ල පාර', coords: { latitude: 6.0533, longitude: 80.2302 },
    doorstep: true, scheduledAt: tomorrowAt(14), price: 8200, status: 'scheduled',
    // The owner asked for another part to be fitted: the garage accepts or declines it (see FitRequestNote).
    progress: { ...newWorkshopProgress(), fitRequests: [{ id: 'fit-b2', partName: 'Wiper blades (front)', supply: 'owner', status: 'requested', requestedAt: Date.now() - 20 * 60 * 1000 }] }, warrantyMonths: 6, assignedTechId: 'm2',
    job: bookedJob('job-b2', '11', 'බැටරිය බැහැලා, වාහනය පණගන්වන්න බැහැ. ගෙදරටම ඇවිත් මාරු කරන්න පුළුවන්ද?', c('කවිෂා රත්නායක', '0779876508'),
      v('March K11', 'WP-1029', 'Hatchback'), 'වක්වැල්ල පාර', { latitude: 6.0533, longitude: 80.2302 }, 2.3, true, { photos: [JOB_PHOTOS[1]], sparePart: 'Genuine' }),
  },
  {
    id: 'b5', source: 'bid', title: 'Engine Overhaul', icon: '🔧', customer: c('නුවන් ජයවර්ධන', '0779876513'),
    vehicle: v('Premio', 'CAD-4410', 'Sedan'), address: 'ගාල්ල කොටුව', coords: { latitude: 6.0301, longitude: 80.2152 },
    doorstep: false, scheduledAt: tomorrowAt(11), price: 38000, status: 'scheduled', locationSharedAt: Date.now() - 20 * HOUR,
    // The owner asked to cancel while the engine is at the garage: the garage answers with its compensation (see CancelQuoteSheet).
    progress: { ...newWorkshopProgress(), stage: 'received', receivedAt: Date.now() - 20 * HOUR, cancelRequest: { status: 'requested', requestedAt: Date.now() - 10 * 60 * 1000, reason: 'ගරාජය ප්‍රමාද වෙනවා', note: 'අද ම වාහනය අවශ්‍යයි.' } }, warrantyMonths: 6,
  },
  {
    id: 'b6', source: 'direct', title: 'A/C Repair', icon: '❄', customer: c('ඉෂාරා සමරවීර', '0779876514'),
    vehicle: v('Vezel', 'CAB-7781', 'SUV'), address: 'කරාපිටිය', coords: { latitude: 6.0588, longitude: 80.2305 },
    doorstep: false, scheduledAt: tomorrowAt(16), price: 9500, status: 'scheduled', locationSharedAt: Date.now() - 6 * HOUR,
    progress: newWorkshopProgress(), warrantyMonths: 3,
  },
  {
    id: 'b7', source: 'bid', title: 'Suspension Check', icon: '🔩', customer: c('රුවන් අබේසිංහ', '0779876515'),
    vehicle: v('Axio', 'CAA-3398', 'Sedan'), address: 'ගාල්ල කොටුව', coords: { latitude: 6.0287, longitude: 80.2165 },
    doorstep: false, scheduledAt: Date.now() + DAY, price: 12500, status: 'cancelled',
    warrantyMonths: 3,
    cancelled: { at: Date.now() - 3 * HOUR, by: 'owner', reason: 'වෙනත් ගරාජයක් තෝරා ගත්තා', note: 'ළඟම ගරාජයකින් අද ම හදා ගත්තා.', rating: 4, compensation: 1500, workDone: 'වාහනය භාර ගෙන පරීක්ෂා කර ඇත', feeNote: 'වන්දි රු. 1,500 ඔබට ලැබේ.' },
  },
  {
    id: 'b3', source: 'sos', title: 'ටයර් පන්චර්', icon: '🛞', customer: c('සචිනි පෙරේරා', '0779876509'),
    vehicle: v('Swift', 'CAF-4455', 'Hatchback'), address: 'රිච්මන්ඩ් කන්ද', coords: { latitude: 6.0384, longitude: 80.2210 },
    doorstep: false, scheduledAt: Date.now() - 5 * DAY, price: 3500, status: 'completed', completedAt: Date.now() - 5 * DAY, rating: 5,
  },
  {
    id: 'b4', source: 'bid', title: 'Brake Pads', icon: '🛑', customer: c('අමිල ප්‍රනාන්දු', '0779876510'),
    vehicle: v('Corolla', 'CAD-9087', 'Sedan'), address: 'කරාපිටිය', coords: { latitude: 6.0631, longitude: 80.2284 },
    doorstep: false, scheduledAt: Date.now() - 2 * DAY, price: 6800, status: 'completed', completedAt: Date.now() - 2 * DAY + 3 * HOUR, rating: 4,
    // Closed with only part of the bill paid; the rest was promised for today, so the garage is reminded to collect it (see PaymentNote / ReceivablesCard).
    progress: { ...newWorkshopProgress(), stage: 'closed', closedAt: Date.now() - 2 * DAY + 3 * HOUR, payment: { ...makePayment(6800, 4000, { promisedAt: promiseAt(0), now: Date.now() - 2 * DAY + 3 * HOUR }), confirm: 'confirmed' } },
  },
];

// Jobs this garage finished earlier for customers whose new bookings are in the lists above: so a returning customer shows as one (with the
// dates of what was done before), a regular one has three or more, and one not seen for over a year is lapsed.
const earlier = (
  id: string,
  source: Booking['source'],
  title: string,
  icon: string,
  customer: Customer,
  vehicle: CustomerVehicle,
  daysAgo: number,
  price: number,
  rating: number,
  note?: string
): Booking => {
  const at = Date.now() - daysAgo * DAY;
  return {
    id,
    source,
    title,
    icon,
    customer,
    vehicle,
    address: 'ගාල්ල',
    coords: { latitude: 6.0329, longitude: 80.217 },
    doorstep: false,
    scheduledAt: at - 3 * HOUR,
    price,
    status: 'completed',
    completedAt: at,
    rating,
    warrantyMonths: 3,
    ...(note ? { note } : {}),
    progress: { ...newWorkshopProgress(), stage: 'closed', receivedAt: at - 4 * HOUR, closedAt: at, warrantyUntil: at + 90 * DAY },
  };
};
const EARLIER_JOBS: Booking[] = [
  // Ishara (booked A/C Repair): twice before -> returning
  earlier('e1', 'direct', 'Oil Change', '🛢️', c('ඉෂාරා සමරවීර', '0779876514'), v('Vezel', 'CAB-7781', 'SUV'), 48, 5200, 5, 'එන්ජින් ඔයිල් සහ පෙරහන මාරු කළා.'),
  earlier('e2', 'bid', 'Brake Pads', '🛑', c('ඉෂාරා සමරවීර', '0779876514'), v('Vezel', 'CAB-7781', 'SUV'), 150, 9800, 4),
  // Nuwan (engine overhaul booked): three times before -> regular
  earlier('e3', 'bid', 'Battery Replacement', '🔋', c('නුවන් ජයවර්ධන', '0779876513'), v('Premio', 'CAD-4410', 'Sedan'), 35, 12500, 5),
  earlier('e4', 'direct', 'Full Service', '🛠️', c('නුවන් ජයවර්ධන', '0779876513'), v('Premio', 'CAD-4410', 'Sedan'), 120, 14500, 5, 'ගියර් ඔයිල් සහ බ්‍රේක් ෆ්ලුයිඩ් ද මාරු කළා.'),
  earlier('e5', 'sos', 'ටයර් පන්චර්', '🛞', c('නුවන් ජයවර්ධන', '0779876513'), v('Premio', 'CAD-4410', 'Sedan'), 260, 3500, 4),
  // Ruwan (suspension check booked): one job more than a year ago -> lapsed
  earlier('e6', 'bid', 'Wheel Alignment', '🛞', c('රුවන් අබේසිංහ', '0779876515'), v('Axio', 'CAA-3398', 'Sedan'), 430, 4500, 5),
  // Dulan and Malsha (direct requests waiting): one and three before
  earlier('e7', 'direct', 'A/C Gas Refill', '❄', c('දුලාන් අබේසේකර', '0779876511'), v('Fit GP5', 'CAK-6610', 'Hatchback'), 70, 6500, 5),
  earlier('e8', 'bid', 'Oil Change', '🛢️', c('මල්ෂා කරුණාරත්න', '0779876512'), v('Wagon R', 'CAP-2045', 'Hatchback'), 25, 4200, 5),
  earlier('e9', 'direct', 'Brake Service', '🛑', c('මල්ෂා කරුණාරත්න', '0779876512'), v('Wagon R', 'CAP-2045', 'Hatchback'), 95, 7800, 4),
  earlier('e10', 'bid', 'Full Service', '🛠️', c('මල්ෂා කරුණාරත්න', '0779876512'), v('Wagon R', 'CAP-2045', 'Hatchback'), 180, 11800, 5),
];
BOOKINGS.push(...EARLIER_JOBS);

// Owners who booked this garage directly from a service category.
type DirectSeed = Omit<DirectRequest, 'id' | 'requestedAt' | 'preferredAt' | 'respondBy' | 'status' | 'location' | 'distanceKm'> & {
  address: string;
  km: number;
  bearing: number;
  requestedMinAgo: number;
  /** Preferred slot: days from today and hour of day. */
  day: number;
  hour: number;
};

export const DIRECT_POOL: DirectSeed[] = [
  {
    categoryId: '11', service: 'Battery Replacement', description: 'උදේට වාහනය පණගන්වන්න අමාරුයි. බැටරිය අවුරුදු 3ක් පරණයි, අලුත් එකක් දාන්න ඕන.',
    buddySummary: 'බැටරිය දුර්වල වී ඇත — ආරෝපණ පරීක්ෂාවක් සහ ප්‍රතිස්ථාපනයක්.', customer: c('ශෙහාන් ගුණවර්ධන', '0779876506'),
    vehicle: v('Axio', 'CAA-3398', 'Sedan'), sparePart: 'Genuine', doorstep: true, photos: [JOB_PHOTOS[1]], voiceNotes: [voice('vn4', 12)],
    address: 'හික්කඩුව පාර', km: 2.1, bearing: 310, requestedMinAgo: 8, day: 1, hour: 9,
  },
  {
    categoryId: '5', service: 'Live Diagnostics', description: 'ගියර් මාරු වෙද්දී ගැස්සෙනවා. Check engine ලයිට් එකත් වරින් වර දැල්වෙනවා.',
    customer: c('දුලාන් අබේසේකර', '0779876511'), vehicle: v('Fit GP5', 'CAK-6610', 'Hatchback'), sparePart: 'GarageChoice', doorstep: false,
    photos: [JOB_PHOTOS[0], JOB_PHOTOS[2]], address: 'ගාල්ල කොටුව', km: 1.6, bearing: 230, requestedMinAgo: 35, day: 0, hour: 16,
  },
  {
    categoryId: '7', service: 'Brake Pads', description: 'ඉදිරිපස බ්‍රේක් පෑඩ් ගෙවිලා. සේවා පොතේ කියලා තියෙන්නේ කි.මී. 40,000 දී මාරු කරන්න.',
    customer: c('මල්ෂා කරුණාරත්න', '0779876512'), vehicle: v('Wagon R', 'CAP-2045', 'Hatchback'), sparePart: 'OEM', doorstep: false,
    voiceNotes: [voice('vn5', 15)], address: 'කරාපිටිය', km: 2.9, bearing: 80, requestedMinAgo: 0, day: 2, hour: 11,
  },
  {
    // A routine service: the garage's handover form asks for what was done, the mileage and the next service.
    categoryId: '14', service: 'Oil Change', description: 'කි.මී. 5,000ක් ධාවනය කර ඇත. එන්ජින් තෙල් සහ පෙරහන මාරු කරන්න.',
    customer: c('චමින්ද ප්‍රනාන්දු', '0779876516'), vehicle: v('Aqua', 'CBA-7712', 'Hatchback'), sparePart: 'OEM', doorstep: false,
    address: 'උණවටුන', km: 1.8, bearing: 150, requestedMinAgo: 0, day: 2, hour: 9,
  },
  {
    // A customer this garage has served three times before (see EARLIER_JOBS) books again: it arrives a little later, like a real new request.
    categoryId: '6', service: 'Wheel Alignment', description: 'ස්ටියරින් එක එක පැත්තකට ඇදෙනවා. වීල් ඇලයින්මන්ට් එකක් කරන්න.',
    customer: c('නුවන් ජයවර්ධන', '0779876513'), vehicle: v('Premio', 'CAD-4410', 'Sedan'), sparePart: 'GarageChoice', doorstep: false,
    address: 'ගාල්ල කොටුව', km: 1.2, bearing: 200, requestedMinAgo: 0, day: 1, hour: 10,
  },
];

/** A direct booking waits this long for the garage before the owner may go elsewhere. */
export const DIRECT_RESPONSE_MIN = 120;
export const DIRECT_ARRIVAL_MS = 60000;

export const SOS_ARRIVAL_MS = 30000;
export const FEED_ARRIVAL_MS = 45000;
export const BID_DECISION_MS = 20000;
