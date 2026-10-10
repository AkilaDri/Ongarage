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
export type GarageProfileContent = { offers: GarageOffer[]; services: GarageService[]; gigs: GarageGig[]; gallery: { id: string; source: ImageSourcePropType; caption: string }[]; reels: GarageReel[] };

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

  return { offers, services, gigs, gallery, reels };
};
