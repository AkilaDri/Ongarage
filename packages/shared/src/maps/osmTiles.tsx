import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { getThemeMode } from '../theme/colors';
import type { LatLng } from '../types';

/**
 * OpenStreetMap tiles, the map used when no Google key is set (or EXPO_PUBLIC_MAP_PROVIDER=osm).
 * The map is a grid of 256px tiles placed with the same Web Mercator maths as the pins, so overlays line up.
 * Light mode uses the standard OpenStreetMap style; dark mode uses CARTO's dark style, which is built from the same OpenStreetMap data.
 */
const TILE = 256;

const worldPoint = (c: LatLng, zoom: number) => {
  const scale = TILE * 2 ** zoom;
  const sin = Math.min(Math.max(Math.sin((c.latitude * Math.PI) / 180), -0.9999), 0.9999);
  return {
    x: ((c.longitude + 180) / 360) * scale,
    y: (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * scale,
  };
};

export const OsmTiles: React.FC<{ center: LatLng; zoom: number; width: number; height: number }> = ({ center, zoom, width, height }) => {
  if (width <= 0 || height <= 0) return null;
  const dark = getThemeMode() === 'dark';
  const c = worldPoint(center, zoom);
  const n = 2 ** zoom;
  const x0 = Math.floor((c.x - width / 2) / TILE);
  const x1 = Math.floor((c.x + width / 2) / TILE);
  const y0 = Math.max(0, Math.floor((c.y - height / 2) / TILE));
  const y1 = Math.min(n - 1, Math.floor((c.y + height / 2) / TILE));
  const tiles: React.ReactNode[] = [];
  for (let ty = y0; ty <= y1; ty++) {
    for (let tx = x0; tx <= x1; tx++) {
      const wrapped = ((tx % n) + n) % n;
      const uri = dark ? `https://a.basemaps.cartocdn.com/dark_all/${zoom}/${wrapped}/${ty}.png` : `https://tile.openstreetmap.org/${zoom}/${wrapped}/${ty}.png`;
      tiles.push(
        <Image
          key={`${tx},${ty}`}
          source={{ uri }}
          style={{ position: 'absolute', width: TILE, height: TILE, left: tx * TILE - c.x + width / 2, top: ty * TILE - c.y + height / 2 }}
        />
      );
    }
  }
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {tiles}
      <View style={styles.attribution}>
        <Text style={styles.attributionText}>{dark ? '© OpenStreetMap · © CARTO' : '© OpenStreetMap contributors'}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  attribution: { position: 'absolute', right: 4, bottom: 2, paddingHorizontal: 4, paddingVertical: 1, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.7)' },
  attributionText: { fontSize: 9, color: '#333' },
});
