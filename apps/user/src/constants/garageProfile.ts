import type { ImageSourcePropType } from 'react-native';
import { marketPrice, SERVICE_CATEGORIES, type Garage } from '@ongarage/shared';
import { GARAGE_COVERS, GARAGE_INFO } from './home';

// What a garage's profile shows besides its rating: the offers it is running, its newest services, freshly posted photos and
// short video reels. Until garages publish these themselves they are put together from what the app already knows
// (the garage's own offer, the service catalogue, the garage photos).

export type GarageOffer = { id: string; icon: string; title: string; detail: string; tone: string };
export type GarageService = { id: string; icon: string; name: string; price: number; isNew: boolean; color: string; jobs: number };
/** A gig: a ready-made service package the garage publishes at a fixed price. */
export type GarageGig = { id: string; title: string; detail: string; hours: number; price: number; orders: number; rating: number; image: ImageSourcePropType; color: string };
export type GarageReel = { id: string; title: string; views: string; length: string; thumb: ImageSourcePropType };
export type GarageHours = { day: string; open: string | null };
export type GarageStaff = { id: string; name: string; role: string; years: number; cert: string };
export type GarageRate = { id: string; icon: string; name: string; labour: number };
export type GarageCert = { id: string; icon: string; title: string; note: string };
/** One line of the garage's wall: something it posted or did lately, kept to a short summary. */
export type GarageWallPost = { id: string; icon: string; label: string; title: string; ago: number; image?: ImageSourcePropType };
export type GarageProfileContent = {
  offers: GarageOffer[];
  services: GarageService[];
  gigs: GarageGig[];
  gallery: { id: string; source: ImageSourcePropType; caption: string }[];
  reels: GarageReel[];
  /** Hotline, WhatsApp (digits only) and email. */
  contact: { hotline: string; whatsapp: string; email: string };
  /** Monday to Sunday; open is null on a day the garage is closed. */
  hours: GarageHours[];
  holiday: string;
  emergency24: boolean;
  vehicleTypes: string[];
  brands: string[];
  staff: GarageStaff[];
  facilities: string[];
  rates: GarageRate[];
  certifications: GarageCert[];
  /** Newest first. */
  wall: GarageWallPost[];
};

const hash = (s: string) => [...s].reduce((n, ch) => n + ch.charCodeAt(0), 0);

export const garageProfileContent = (g: Garage): GarageProfileContent => {
  const seed = hash(g.id + g.name);
  const covers = Object.entries(GARAGE_COVERS);
  // The garage's photos, starting from a different one for each garage and leaving out its own cover.
  const others = covers.filter(([id]) => id !== g.id);
  const photo = (i: number) => others[(seed + i) % others.length];

  const offer = GARAGE_INFO[g.id]?.offer;
  const offers: GarageOffer[] = [
    ...(offer ? [{ id: 'o-info', icon: '🎁', title: offer, detail: 'මෙම සතිය තුළ පමණි', tone: '#f59e0b' }] : []),
    { id: 'o-first', icon: '🏷️', title: 'පළමු සේවාවට 10% වට්ටම', detail: 'OnGarage හරහා වෙන් කරන්න', tone: '#2457e6' },
    { id: 'o-warranty', icon: '🛡️', title: 'අමතර මාස 3 වගකීම', detail: 'ඕනෑම අලුත්වැඩියාවකට', tone: '#10b981' },
  ];

  const services: GarageService[] = Array.from({ length: 6 }, (_, i) => {
    const c = SERVICE_CATEGORIES[(seed + i * 3) % SERVICE_CATEGORIES.length];
    const isNew = i < 2;
    // A new service has only a few finished jobs so far; the established ones have many.
    const jobs = isNew ? 4 + ((seed + i * 5) % 22) : 38 + ((seed * (i + 2)) % 190);
    return { id: `s-${c.id}-${i}`, icon: c.icon, name: c.subcategories[(seed + i) % c.subcategories.length] ?? c.name, price: marketPrice(c.id), isNew, color: c.color, jobs };
  });

  // The packages the garage has put up: the first two services, bundled with what usually goes with them.
  const gigs: GarageGig[] = [
    { name: 'සම්පූර්ණ සර්විස් පැකේජය', detail: 'ඔයිල්, ෆිල්ටර්, පරීක්ෂාව සහ ටයර් අලුත් කිරීම', hours: 3, factor: 1.35 },
    { name: 'බ්‍රේක් හා සස්පෙන්ෂන් පැකේජය', detail: 'පෑඩ්, ඩිස්ක් පරීක්ෂාව සහ ද්‍රව මාරුව', hours: 4, factor: 1.1 },
    { name: 'AC / බැටරි සෞඛ්‍ය පරීක්ෂාව', detail: 'ගෑස්, කොම්ප්‍රෙසරය සහ බැටරි පරීක්ෂාව', hours: 1.5, factor: 0.55 },
  ].map((gg, i) => {
    const c = SERVICE_CATEGORIES[(seed + i * 4) % SERVICE_CATEGORIES.length];
    return {
      id: `g-${i}`,
      title: gg.name,
      detail: gg.detail,
      hours: gg.hours,
      price: Math.round((marketPrice(c.id) * gg.factor) / 50) * 50,
      orders: 24 + ((seed * (i + 3)) % 160),
      rating: Math.min(5, Math.max(4, Number((g.rating - 0.1 * i).toFixed(1)))),
      image: photo(i + 4)[1],
      color: c.color,
    };
  });

  const gallery = Array.from({ length: 6 }, (_, i) => {
    const [id, source] = photo(i);
    return { id: `p-${id}-${i}`, source, caption: ['අලුත්වැඩියා වැඩ', 'නව උපකරණ', 'සේවා ස්ථානය', 'සම්පූර්ණ කළ වාහනය', 'පරීක්ෂාව', 'කණ්ඩායම'][i] };
  });

  const reels: GarageReel[] = [
    { title: 'සම්පූර්ණ සර්විස් එකක් — පෙර / පසු', views: '12.4K', length: '0:24' },
    { title: 'Hybrid battery පරීක්ෂාව', views: '8.1K', length: '0:18' },
    { title: 'අපේ වැඩමුළුව වටේ ඇවිද්දක්', views: '5.7K', length: '0:31' },
  ].map((r, i) => ({ ...r, id: `r-${i}`, thumb: photo(i + 2)[1] }));

  // Contact: the garage's own phone is the hotline; WhatsApp and email follow from it and the name until garages publish theirs.
  const digits = (g.phone || '').replace(/[^0-9]/g, '');
  const whatsapp = digits.startsWith('0') ? `94${digits.slice(1)}` : digits;
  const slug = g.name.toLowerCase().replace(/[^a-z0-9]+/g, '') || 'garage';
  const contact = { hotline: g.phone, whatsapp, email: `info@${slug}.lk` };

  const emergency24 = g.level === 'premier' || seed % 3 === 0;
  const weekday = ['පෙ.ව. 8.00 – ප.ව. 6.00', 'පෙ.ව. 7.30 – ප.ව. 6.30', 'පෙ.ව. 8.30 – ප.ව. 5.30'][seed % 3];
  const hours: GarageHours[] = ['සඳුදා', 'අඟහරුවාදා', 'බදාදා', 'බ්‍රහස්පතින්දා', 'සිකුරාදා', 'සෙනසුරාදා', 'ඉරිදා'].map((day, i) => ({
    day,
    open: i < 5 ? weekday : i === 5 ? 'පෙ.ව. 8.00 – ප.ව. 2.00' : seed % 2 === 0 ? 'පෙ.ව. 9.00 – ප.ව. 1.00' : null,
  }));
  const holiday = emergency24
    ? 'රජයේ නිවාඩු දිනවලත් හදිසි සේවාව (24/7 Emergency Support) ක්‍රියාත්මකයි — පෙර දැනුම් දී වෙන් කරන්න.'
    : 'රජයේ නිවාඩු දිනවල ගරාජය වසා ඇත. හදිසි අවස්ථාවක දුරකථනයෙන් අමතන්න.';

  const pick = <T,>(list: T[], n: number, shift: number) => Array.from({ length: n }, (_, i) => list[(seed + shift + i * 2) % list.length]);
  const uniq = <T,>(list: T[]) => [...new Set(list)];
  const vehicleTypes = uniq(['මෝටර් රථ', ...pick(['SUV / ජීප්', 'වෑන් / මයික්‍රෝ බස්', 'හයිබ්‍රිඩ් / EV', 'ලොරි / ට්‍රක්', 'ත්‍රීරෝද රථ'], 3, 1), ...(g.level === 'premier' ? ['හයිබ්‍රිඩ් / EV'] : [])]);
  const brands = uniq(pick(['Toyota', 'Honda', 'Suzuki', 'Nissan', 'Mitsubishi', 'BMW', 'Mercedes-Benz', 'Audi', 'Mazda', 'Hyundai'], 4, 2));

  const staffPool: { name: string; role: string; cert: string }[] = [
    { name: 'කසුන් පෙරේරා', role: 'ප්‍රධාන කාර්මික ශිල්පී', cert: 'NVQ Level 5' },
    { name: 'නිමල් ජයසිංහ', role: 'එන්ජින් / ස්කෑනින් විශේෂඥ', cert: 'Bosch සහතික' },
    { name: 'චමින්ද සිල්වා', role: 'විදුලි පද්ධති තාක්ෂණික', cert: 'NVQ Level 4' },
    { name: 'රුවන් ප්‍රනාන්දු', role: 'AC / හයිබ්‍රිඩ් කාර්මික', cert: 'Toyota Hybrid පුහුණුව' },
    { name: 'සුරංග ගුණවර්ධන', role: 'බොඩි / පේන්ට් ශිල්පී', cert: 'NVQ Level 4' },
  ];
  const staff: GarageStaff[] = pick(staffPool, 3, 0).map((s, i) => ({ id: `st-${i}`, ...s, years: 5 + ((seed * (i + 2)) % 14) }));

  const facilities = uniq(
    pick(['🛋️ පාරිභෝගික රැඳී සිටින කුටිය', '📶 නොමිලේ Wi-Fi', '☕ තේ / කෝපි පහසුකම්', '📹 CCTV වාහන ආරක්ෂාව', '🅿️ වාහන නැවැත්වීමේ ඉඩ', '💳 කාඩ් / QR ගෙවීම්', '🚗 වාහනය රැගෙන යාම / භාර දීම', '🧰 නවීන ස්කෑනර් සහ උපකරණ'], 6, 1)
  );

  const rates: GarageRate[] = services.map((s, i) => ({ id: `rate-${i}`, icon: s.icon, name: s.name, labour: Math.max(500, Math.round((s.price * 0.35) / 50) * 50) }));

  const certifications: GarageCert[] = [
    ...(g.level === 'premier' || g.rating >= 4.5 ? [{ id: 'c-ins', icon: '🛡️', title: 'රක්ෂණ අනුමත ගරාජය', note: 'Insurance Approved Garage' }] : []),
    { id: 'c-og', icon: '✅', title: 'OnGarage තහවුරු කළ ගරාජය', note: 'ව්‍යාපාර ලියාපදිංචිය සහ ස්ථානය සත්‍යාපනය කර ඇත' },
    { id: 'c-nvq', icon: '🎓', title: 'NVQ සහතික ලත් කාර්මිකයන්', note: 'ජාතික වෘත්තීය සුදුසුකම් ඇති කාර්ය මණ්ඩලය' },
    ...(seed % 2 === 0 ? [{ id: 'c-iso', icon: '🏅', title: 'ISO 9001 ගුණාත්මක සහතිකය', note: 'ගුණාත්මක කළමනාකරණ පද්ධතිය' }] : []),
  ];

  // The wall: the newest things the garage has put up, boiled down to a headline each.
  const HOUR = 60 * 60 * 1000;
  const newService = services.find((x) => x.isNew);
  const replied = (g.recentReviews ?? []).find((r) => r.reply);
  const wall: GarageWallPost[] = [
    { id: 'w-offer', icon: '🎁', label: 'අලුත් දීමනාවක්', title: offers[0].title, ago: 3 * HOUR + (seed % 5) * HOUR },
    ...(newService ? [{ id: 'w-service', icon: '🛠️', label: 'අලුත් සේවාවක්', title: newService.name, ago: 20 * HOUR + (seed % 7) * HOUR }] : []),
    { id: 'w-photos', icon: '📸', label: 'අලුත් ඡායාරූප', title: `${gallery[0].caption} ඇතුළුව ඡායාරූප ${gallery.length}ක්`, ago: 30 * HOUR + (seed % 9) * HOUR, image: gallery[0].source },
    { id: 'w-gig', icon: '⚡', label: 'අලුත් පැකේජයක්', title: `${gigs[0].title} · රු. ${gigs[0].price.toLocaleString()}`, ago: 52 * HOUR + (seed % 11) * HOUR },
    { id: 'w-reel', icon: '🎬', label: 'අලුත් වීඩියෝවක්', title: reels[0].title, ago: 76 * HOUR + (seed % 13) * HOUR, image: reels[0].thumb },
    ...(replied ? [{ id: 'w-reply', icon: '💬', label: 'සමාලෝචනයකට පිළිතුරු', title: `${replied.customer}ට පිළිතුරු දුන්නා`, ago: 100 * HOUR + (seed % 17) * HOUR }] : []),
  ].sort((a, b) => a.ago - b.ago);

  return { offers, services, gigs, gallery, reels, wall, contact, hours, holiday, emergency24, vehicleTypes, brands, staff, facilities, rates, certifications };
};
