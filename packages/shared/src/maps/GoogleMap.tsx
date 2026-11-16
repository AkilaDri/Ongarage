import React, { useEffect, useState } from 'react';
import { Image, Pressable, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { DotGrid } from '../ui/Visuals';
import { GOOGLE_MAPS_API_KEY, mapPointToLatLng, projectToMap, staticMapUrl } from './googleMaps';
import { type LatLng } from '../types';
import { Colors, themedStyles } from '../theme/colors';

export type Project = (point: LatLng) => { x: number; y: number } | null;

interface GoogleMapProps {
  center: LatLng;
  zoom?: number;
  style?: StyleProp<ViewStyle>;
  fallbackColor?: string;
  onPressCoordinate?: (coords: LatLng) => void;
  renderOverlay?: (project: Project) => React.ReactNode;
  children?: React.ReactNode;
}

export const GoogleMap: React.FC<GoogleMapProps> = ({
  center,
  zoom = 14,
  style,
  fallbackColor = '#38bdf8',
  onPressCoordinate,
  renderOverlay,
  children,
}) => {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [failed, setFailed] = useState(!GOOGLE_MAPS_API_KEY);
  const url = size.width > 0 ? staticMapUrl(center, zoom, size.width, size.height) : null;

  useEffect(() => {
    if (GOOGLE_MAPS_API_KEY) setFailed(false);
  }, [url]);

  const project: Project = (point) => {
    const p = projectToMap(point, center, zoom, size.width, size.height);
    const inside = p.x >= 0 && p.y >= 0 && p.x <= size.width && p.y <= size.height;
    return inside ? p : null;
  };

  return (
    <View style={[styles.container, style]} onLayout={(e) => setSize(e.nativeEvent.layout)}>
      {url && !failed ? (
        <Image source={{ uri: url }} style={StyleSheet.absoluteFill} resizeMode="cover" onError={() => setFailed(true)} />
      ) : (
        <DotGrid color={fallbackColor} spacing={28} opacity={0.22} />
      )}

      {onPressCoordinate && (
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={(e) => {
            // Native gives locationX/Y; on the web the press is a mouse click, which only has offsetX/Y.
            const ne = e.nativeEvent as unknown as { locationX?: number; locationY?: number; offsetX?: number; offsetY?: number };
            const x = ne.locationX ?? ne.offsetX;
            const y = ne.locationY ?? ne.offsetY;
            if (!Number.isFinite(x) || !Number.isFinite(y) || size.width === 0) return;
            onPressCoordinate(mapPointToLatLng(x as number, y as number, center, zoom, size.width, size.height));
          }}
        />
      )}

      {size.width > 0 && renderOverlay?.(project)}
      {children}
    </View>
  );
};

const styles = themedStyles(() => StyleSheet.create({
  container: { backgroundColor: Colors.mapBg, overflow: 'hidden' },
}));
