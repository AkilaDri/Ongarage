import type { ImageSourcePropType } from 'react-native';

// What the Home screen shows beyond the core actions: category photos, garage cover
// photos, sponsored placements, promo banners and offers. Images are bundled (Unsplash /
// Pexels licence) so Home works offline. A backend would serve the ads and offers.

const DAY = 24 * 60 * 60 * 1000;

/** Round category photos, by SERVICE_CATEGORIES id. */
export const CATEGORY_IMAGES: Record<string, ImageSourcePropType> = {
  '1': require('../../assets/home/category-icons/mechanical.png'),
  '2': require('../../assets/home/category-icons/electrical.png'),
  '3': require('../../assets/home/category-icons/hybrid.png'),
  '4': require('../../assets/home/category-icons/ac.png'),
  '5': require('../../assets/home/category-icons/scan.png'),
  '6': require('../../assets/home/category-icons/tyres.png'),
  '7': require('../../assets/home/category-icons/brakes.png'),
  '8': require('../../assets/home/category-icons/paint.png'),
  '9': require('../../assets/home/category-icons/wash.png'),
  '10': require('../../assets/home/category-icons/tuning.png'),
  '11': require('../../assets/home/category-icons/battery.png'),
  '12': require('../../assets/home/category-icons/towing.png'),
};

/**
 * Optical fit for each category icon. The artwork files differ in canvas size, margins and how much of
 * the frame the drawing fills, so each one is scaled by its visible area (not its outer border) and
 * centred on the drawing; dx / dy are fractions of the frame. Regenerate if an icon is replaced.
 */
export const CATEGORY_ICON_FIT: Record<string, { scale: number; dx: number; dy: number }> = {
  '1': { scale: 0.97, dx: 0.0004, dy: 0.0284 }, // mechanical
  '2': { scale: 1.168, dx: 0.0009, dy: 0.0328 }, // electrical
  '3': { scale: 1.069, dx: 0.0004, dy: 0.0093 }, // hybrid
  '4': { scale: 0.997, dx: 0, dy: 0.0044 }, // ac
  '5': { scale: 1.065, dx: 0, dy: 0.0265 }, // scan
  '6': { scale: 1.06, dx: 0.0004, dy: 0.0142 }, // tyres
  '7': { scale: 1.047, dx: 0.0004, dy: 0.0244 }, // brakes
  '8': { scale: 1.015, dx: 0.0004, dy: 0.0279 }, // paint
  '9': { scale: 0.991, dx: 0.0004, dy: 0.0319 }, // wash
  '10': { scale: 1.044, dx: 0.0009, dy: 0.0244 }, // tuning
  '11': { scale: 1.104, dx: 0.0018, dy: 0.027 }, // battery
  '12': { scale: 1.119, dx: 0.0004, dy: 0.0279 }, // towing
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
