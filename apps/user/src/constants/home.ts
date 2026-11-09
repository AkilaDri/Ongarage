import type { ImageSourcePropType } from 'react-native';

// What the Home screen shows beyond the core actions: category photos, garage cover
// photos, sponsored placements, promo banners and offers. Images are bundled (Unsplash /
// Pexels licence) so Home works offline. A backend would serve the ads and offers.

const DAY = 24 * 60 * 60 * 1000;

/** Category artwork (the designer's cut-outs in assets/job cat icons), by SERVICE_CATEGORIES id. */
export const CATEGORY_IMAGES: Record<string, ImageSourcePropType> = {
  '1': require('../../assets/job cat icons/Mechanical.png'),
  '2': require('../../assets/job cat icons/electrical.png'),
  '3': require('../../assets/job cat icons/Hybrid.png'),
  '4': require('../../assets/job cat icons/AC.png'),
  '5': require('../../assets/job cat icons/Scan.png'),
  '6': require('../../assets/job cat icons/tyres.png'),
  '7': require('../../assets/job cat icons/brakes.png'),
  '8': require('../../assets/job cat icons/Paint.png'),
  '9': require('../../assets/job cat icons/Wash.png'),
  '10': require('../../assets/job cat icons/Tuning.png'),
  '11': require('../../assets/job cat icons/Battery.png'),
  '12': require('../../assets/job cat icons/Towing.png'),
  '13': require('../../assets/job cat icons/ev-charging.png'), // EV Charging
  '14': require('../../assets/job cat icons/service.png'), // Service
  '16': require('../../assets/job cat icons/petrol.png'), // Fuel Station
};

/**
 * Optical fit for each category icon. The artwork files differ in how much of the frame the drawing fills and where it
 * sits, so each one is scaled to a common visible size and centred on the drawing; dx / dy are fractions of the frame.
 * Worked out from each file's visible area: regenerate if an icon is replaced.
 */
export const CATEGORY_ICON_FIT: Record<string, { scale: number; dx: number; dy: number }> = {
  // Each scale brings the icon's visible height or width (its ink bounds, measured per file) to the same size; dx / dy centre the ink.
  '1': { scale: 1.18, dx: 0.003, dy: -0.003 }, // mechanical
  '2': { scale: 1.25, dx: 0.008, dy: 0.005 }, // electrical
  '3': { scale: 0.88, dx: 0, dy: -0.051 }, // hybrid
  '4': { scale: 1.14, dx: 0.013, dy: -0.039 }, // ac
  '5': { scale: 1.05, dx: 0.016, dy: -0.043 }, // scan
  '6': { scale: 1.14, dx: 0.004, dy: 0.015 }, // tyres
  '7': { scale: 1.18, dx: 0.003, dy: -0.017 }, // brakes
  '8': { scale: 1.22, dx: 0.004, dy: -0.022 }, // paint
  '9': { scale: 1.15, dx: 0.03, dy: 0 }, // wash
  '10': { scale: 1.03, dx: -0.014, dy: -0.012 }, // tuning
  '11': { scale: 1.45, dx: 0.001, dy: -0.004 }, // battery (capped: thin artwork)
  '12': { scale: 1.01, dx: 0, dy: -0.002 }, // towing
  '13': { scale: 1.0, dx: 0.014, dy: 0.01 }, // ev charging
  '14': { scale: 1.02, dx: -0.016, dy: -0.034 }, // service
  '16': { scale: 1.01, dx: -0.019, dy: 0.01 }, // fuel station
};

/** The artwork of each SOS breakdown type (BREAKDOWN_TYPES id), from assets/sos-icons. */
export const BREAKDOWN_IMAGES: Record<string, ImageSourcePropType> = {
  mechanical: require('../../assets/sos-icons/mechanical.png'),
  battery: require('../../assets/sos-icons/battery.png'),
  tire: require('../../assets/sos-icons/tire.png'),
  fuel: require('../../assets/sos-icons/fuel.png'),
  towing: require('../../assets/sos-icons/towing.png'),
  lockout: require('../../assets/sos-icons/lockout.png'),
  overheating: require('../../assets/sos-icons/overheating.png'),
  winching: require('../../assets/sos-icons/winching.png'),
  accident: require('../../assets/sos-icons/accident.png'),
};

/** One cover photo per garage (MOCK_GARAGES id). */
export const GARAGE_COVERS: Record<string, ImageSourcePropType> = {
  '1': require('../../assets/home/garages/g2.jpg'),
  '2': require('../../assets/home/garages/g6.jpg'),
  '3': require('../../assets/home/garages/g5.jpg'),
  '4': require('../../assets/home/garages/g3.jpg'),
  '5': require('../../assets/home/garages/g4.jpg'),
  '6': require('../../assets/home/garages/g7.jpg'),
  '7': require('../../assets/home/garages/g8.jpg'),
  '8': require('../../assets/home/garages/g1.jpg'),
  '9': require('../../assets/home/garages/g9.jpg'),
};

/** When each garage joined OnGarage (for "newly joined") and how fast it usually replies. */
export const GARAGE_INFO: Record<string, { joinedAt: number; replyMin: number; offer?: string }> = {
  '1': { joinedAt: Date.now() - 210 * DAY, replyMin: 10, offer: 'නොමිලේ පරීක්ෂාව' },
  '2': { joinedAt: Date.now() - 400 * DAY, replyMin: 15 },
  '3': { joinedAt: Date.now() - 300 * DAY, replyMin: 20 },
  '4': { joinedAt: Date.now() - 180 * DAY, replyMin: 25 },
  '5': { joinedAt: Date.now() - 520 * DAY, replyMin: 8, offer: '🛡️ ආරක්ෂිත රැකියා' },
  '6': { joinedAt: Date.now() - 12 * DAY, replyMin: 12, offer: 'පළමු සේවාවට 10%' },
  '7': { joinedAt: Date.now() - 5 * DAY, replyMin: 18, offer: 'පළමු සේවාවට 10%' },
  '8': { joinedAt: Date.now() - 34 * DAY, replyMin: 14, offer: 'ඩීටේලින් 20%' },
  '9': { joinedAt: Date.now() - 260 * DAY, replyMin: 9 },
};

/** "Newly joined" covers garages that joined within this many days. */
export const NEW_GARAGE_DAYS = 60;

/**
 * Paid placements (garages spend the ad credits their plan includes). Always labelled
 * as ads, and kept apart from the organic rows, which ads never change.
 */
export const SPONSORED_GARAGE_IDS = ['5', '8', '1'];

export type PromoBanner = { id: string; image: ImageSourcePropType; garageId: string; title: string; subtitle: string; cta: string };

export const PROMO_BANNERS: PromoBanner[] = [
  { id: 'pb1', image: require('../../assets/home/banners/ev.jpg'), garageId: '6', title: 'හයිබ්‍රිඩ් / EV සේවාව', subtitle: 'Galle Hybrid Care · පළමු සේවාවට 10% වට්ටම්', cta: 'බලන්න' },
  { id: 'pb2', image: require('../../assets/home/banners/wash.jpg'), garageId: '8', title: 'සම්පූර්ණ ඩීටේලින් 20%', subtitle: 'Karapitiya Auto Spa · මෙම සතියේ පමණි', cta: 'බලන්න' },
  { id: 'pb3', image: require('../../assets/home/banners/service.jpg'), garageId: '5', title: 'ආරක්ෂිත රැකියා', subtitle: 'AutoTech Motors · OnGarage Guarantee සමඟ', cta: 'බලන්න' },
];

/** Colourful offer tiles: each opens a category or a list of garages. */
export type Offer = { id: string; title: string; subtitle: string; emoji: string; stops: { offset: string; color: string }[] } & (
  | { categoryId: string }
  | { list: 'new' | 'protected' }
);

export const OFFERS: Offer[] = [
  { id: 'of1', title: 'අලුත් ගරාජ', subtitle: 'පළමු සේවාවට 10% වට්ටම්', emoji: '🎉', list: 'new', stops: [{ offset: '0', color: '#0ea5e9' }, { offset: '1', color: '#22d3ee' }] },
  { id: 'of2', title: 'ඩීටේලින් 20%', subtitle: 'වොෂ් සහ ඩීටේලින්', emoji: '🧽', categoryId: '9', stops: [{ offset: '0', color: '#8b5cf6' }, { offset: '1', color: '#d946ef' }] },
  { id: 'of3', title: 'නොමිලේ පරීක්ෂාව', subtitle: 'බ්‍රේක් සහ සස්පෙන්ෂන්', emoji: '🛑', categoryId: '7', stops: [{ offset: '0', color: '#f97316' }, { offset: '1', color: '#f59e0b' }] },
  { id: 'of4', title: 'ආරක්ෂිත රැකියා', subtitle: 'OnGarage Guarantee', emoji: '🛡️', list: 'protected', stops: [{ offset: '0', color: '#10b981' }, { offset: '1', color: '#84cc16' }] },
];
