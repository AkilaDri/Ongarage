import type { LatLng } from '../types';
import { getThemeMode } from '../theme/colors';
import { distanceKm } from '../utils/geo';

export { distanceKm };

export const GOOGLE_MAPS_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ?? '';

const LANGUAGE = 'si';
const REGION = 'lk';
const TILE_SIZE = 256;
const STATIC_MAX = 640;

const DARK_STYLE = [
  'element:geometry|color:0x0b1120',
  'element:labels.icon|visibility:off',
  'element:labels.text.fill|color:0x94a3b8',
  'element:labels.text.stroke|color:0x07090e',
  'feature:administrative|element:geometry|color:0x1e293b',
  'feature:poi|visibility:off',
  'feature:road|element:geometry|color:0x1e293b',
  'feature:road.highway|element:geometry|color:0x334155',
  'feature:road|element:labels.text.fill|color:0x64748b',
  'feature:transit|visibility:off',
  'feature:water|element:geometry|color:0x030712',
  'feature:water|element:labels.text.fill|color:0x334155',
];

const LIGHT_STYLE = [
  'element:labels.icon|visibility:off',
  'element:labels.text.fill|color:0x475569',
  'feature:poi|visibility:off',
  'feature:transit|visibility:off',
  'feature:landscape|element:geometry|color:0xf1f5f9',
  'feature:road|element:geometry|color:0xffffff',
  'feature:road.highway|element:geometry|color:0xe2e8f0',
  'feature:water|element:geometry|color:0xbae6fd',
];

const fmt = (c: LatLng) => `${c.latitude.toFixed(6)},${c.longitude.toFixed(6)}`;

export function staticMapUrl(center: LatLng, zoom: number, width: number, height: number): string {
  const w = Math.min(Math.round(width), STATIC_MAX);
  const h = Math.min(Math.round(height), STATIC_MAX);
  const params = [
    `center=${fmt(center)}`,
    `zoom=${zoom}`,
    `size=${w}x${h}`,
    'scale=2',
    `language=${LANGUAGE}`,
    `region=${REGION}`,
    ...(getThemeMode() === 'dark' ? DARK_STYLE : LIGHT_STYLE).map((s) => `style=${encodeURIComponent(s)}`),
    `key=${GOOGLE_MAPS_API_KEY}`,
  ];
  return `https://maps.googleapis.com/maps/api/staticmap?${params.join('&')}`;
}

// Web Mercator projection, used to place overlay pins on a static map image and to map taps back to coordinates.
const worldPoint = (c: LatLng, zoom: number) => {
  const scale = TILE_SIZE * 2 ** zoom;
  const sin = Math.min(Math.max(Math.sin((c.latitude * Math.PI) / 180), -0.9999), 0.9999);
  return {
    x: ((c.longitude + 180) / 360) * scale,
    y: (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * scale,
  };
};

export function projectToMap(point: LatLng, center: LatLng, zoom: number, width: number, height: number) {
  const p = worldPoint(point, zoom);
  const c = worldPoint(center, zoom);
  return { x: width / 2 + (p.x - c.x), y: height / 2 + (p.y - c.y) };
}

export function mapPointToLatLng(x: number, y: number, center: LatLng, zoom: number, width: number, height: number): LatLng {
  const scale = TILE_SIZE * 2 ** zoom;
  const c = worldPoint(center, zoom);
  const wx = c.x + (x - width / 2);
  const wy = c.y + (y - height / 2);
  const n = Math.PI - (2 * Math.PI * wy) / scale;
  return {
    latitude: (180 / Math.PI) * Math.atan(Math.sinh(n)),
    longitude: (wx / scale) * 360 - 180,
  };
}


export function offsetCoordinate(origin: LatLng, km: number, bearingDeg: number): LatLng {
  const R = 6371;
  const d = km / R;
  const brng = (bearingDeg * Math.PI) / 180;
  const lat1 = (origin.latitude * Math.PI) / 180;
  const lng1 = (origin.longitude * Math.PI) / 180;
  const lat2 = Math.asin(Math.sin(lat1) * Math.cos(d) + Math.cos(lat1) * Math.sin(d) * Math.cos(brng));
  const lng2 = lng1 + Math.atan2(Math.sin(brng) * Math.sin(d) * Math.cos(lat1), Math.cos(d) - Math.sin(lat1) * Math.sin(lat2));
  return { latitude: (lat2 * 180) / Math.PI, longitude: (lng2 * 180) / Math.PI };
}

export const kmToMapPixels = (km: number, latitude: number, zoom: number) =>
  (km * 1000) / ((156543.03392 * Math.cos((latitude * Math.PI) / 180)) / 2 ** zoom);

export function zoomToFit(km: number, latitude: number, spanPx: number): number {
  const metersPerPxAtZ0 = 156543.03392 * Math.cos((latitude * Math.PI) / 180);
  const z = Math.floor(Math.log2((metersPerPxAtZ0 * spanPx) / Math.max(km * 1000 * 1.25, 200)));
  return Math.min(17, Math.max(10, z));
}

// Rough urban driving estimate (~30 km/h plus dispatch time).
export const etaMinutes = (km: number) => Math.max(2, Math.round((km / 30) * 60 + 2));

export const directionsUrl = (dest: LatLng, origin?: LatLng) =>
  `https://www.google.com/maps/dir/?api=1&destination=${fmt(dest)}${origin ? `&origin=${fmt(origin)}` : ''}&travelmode=driving`;

type GeocodeResult = {
  formatted_address: string;
  geometry: { location: { lat: number; lng: number } };
  address_components: { long_name: string; types: string[] }[];
};

async function geocode(query: string): Promise<GeocodeResult> {
  const res = await fetch(
    `https://maps.googleapis.com/maps/api/geocode/json?${query}&language=${LANGUAGE}&region=${REGION}&key=${GOOGLE_MAPS_API_KEY}`
  );
  const json = await res.json();
  if (json.status !== 'OK' || !json.results?.length) {
    throw new Error(json.error_message ?? `Geocoding failed: ${json.status}`);
  }
  return json.results[0];
}

const pickLocality = (r: GeocodeResult) =>
  r.address_components.find((c) => c.types.includes('locality'))?.long_name ??
  r.address_components.find((c) => c.types.includes('administrative_area_level_2'))?.long_name ??
  r.formatted_address.split(',')[0];

export async function reverseGeocode(coords: LatLng): Promise<{ address: string; locality: string }> {
  const r = await geocode(`latlng=${fmt(coords)}`);
  return { address: r.formatted_address, locality: pickLocality(r) };
}

export async function geocodeAddress(address: string): Promise<{ address: string; coords: LatLng }> {
  const r = await geocode(`address=${encodeURIComponent(address)}&components=country:${REGION.toUpperCase()}`);
  return {
    address: r.formatted_address,
    coords: { latitude: r.geometry.location.lat, longitude: r.geometry.location.lng },
  };
}

export type PlaceSuggestion = { placeId: string; mainText: string; secondaryText: string };

export async function autocompletePlaces(input: string, bias: LatLng): Promise<PlaceSuggestion[]> {
  const res = await fetch('https://places.googleapis.com/v1/places:autocomplete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': GOOGLE_MAPS_API_KEY },
    body: JSON.stringify({
      input,
      languageCode: LANGUAGE,
      includedRegionCodes: [REGION],
      locationBias: { circle: { center: bias, radius: 30000 } },
    }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error?.message ?? 'Places autocomplete failed');
  return (json.suggestions ?? [])
    .filter((s: any) => s.placePrediction)
    .map((s: any) => ({
      placeId: s.placePrediction.placeId,
      mainText: s.placePrediction.structuredFormat?.mainText?.text ?? s.placePrediction.text.text,
      secondaryText: s.placePrediction.structuredFormat?.secondaryText?.text ?? '',
    }));
}

export async function placeDetails(placeId: string): Promise<{ address: string; coords: LatLng }> {
  const res = await fetch(`https://places.googleapis.com/v1/places/${placeId}?languageCode=${LANGUAGE}`, {
    headers: { 'X-Goog-Api-Key': GOOGLE_MAPS_API_KEY, 'X-Goog-FieldMask': 'location,formattedAddress' },
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error?.message ?? 'Place details failed');
  return { address: json.formattedAddress, coords: json.location };
}
