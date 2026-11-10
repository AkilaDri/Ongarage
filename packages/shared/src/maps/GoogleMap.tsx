import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Image, PanResponder, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { DotGrid } from '../ui/Visuals';
import { GOOGLE_MAPS_API_KEY, MAP_PROVIDER, mapPointToLatLng, projectToMap, staticMapUrl } from './googleMaps';
import { OsmTiles } from './osmTiles';
import { type LatLng } from '../types';
import { Colors, themedStyles } from '../theme/colors';

export type Project = (point: LatLng) => { x: number; y: number } | null;

const MIN_ZOOM = 3;
const MAX_ZOOM = 19;
/** Two taps this close in time and place are a double tap: it zooms in on that spot. */
const DOUBLE_TAP_MS = 300;
const DOUBLE_TAP_PX = 28;
/** A touch that moves less than this is a tap, not a drag. */
const TAP_SLOP_PX = 6;

interface GoogleMapProps {
  center: LatLng;
  zoom?: number;
  style?: StyleProp<ViewStyle>;
  fallbackColor?: string;
  /** A tap places a spot (the picker's pin moves to it). */
  onPressCoordinate?: (coords: LatLng) => void;
  /**
   * The owner moved the map by dragging, pinching or double-tapping. Called when the gesture ends with the new centre and zoom.
   * Giving this turns the map's gestures on: drag to pan, pinch or double-tap to zoom.
   */
  onRegionChange?: (center: LatLng, zoom: number) => void;
  renderOverlay?: (project: Project) => React.ReactNode;
  children?: React.ReactNode;
}

type View = { center: LatLng; zoom: number };

const distance = (a: { pageX: number; pageY: number }, b: { pageX: number; pageY: number }) => Math.hypot(a.pageX - b.pageX, a.pageY - b.pageY);
/** How many fingers are on the map now. */
const touchCount = (e: { nativeEvent: object }) => ((e.nativeEvent as { touches?: unknown[] }).touches ?? []).length;

export const GoogleMap: React.FC<GoogleMapProps> = ({
  center,
  zoom = 14,
  style,
  fallbackColor = '#38bdf8',
  onPressCoordinate,
  onRegionChange,
  renderOverlay,
  children,
}) => {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [failed, setFailed] = useState(!GOOGLE_MAPS_API_KEY);
  // The view the map shows. Gestures move it at once; the owner of the map hears about it when the gesture ends.
  const [view, setView] = useState<View>({ center, zoom });
  useEffect(() => {
    setView({ center, zoom });
  }, [center.latitude, center.longitude, zoom]);

  const url = size.width > 0 ? staticMapUrl(view.center, view.zoom, size.width, size.height) : null;

  useEffect(() => {
    if (GOOGLE_MAPS_API_KEY) setFailed(false);
  }, [url]);

  // The gesture handlers read the latest values through these refs, so one responder serves every render.
  const live = useRef(view);
  live.current = view;
  const sizeRef = useRef(size);
  sizeRef.current = size;
  const callbacks = useRef({ onPressCoordinate, onRegionChange });
  callbacks.current = { onPressCoordinate, onRegionChange };
  const gesture = useRef({ x0: 0, y0: 0, moved: false, pinching: false, startDist: 0, startZoom: zoom, startView: { center, zoom } as View });
  const lastTap = useRef<{ t: number; x: number; y: number } | null>(null);

  // Every map zooms with a pinch. Drag and taps are on when the map has a handler for them; a map without one still lets a single finger
  // through to the things under it (a sheet, a pin), so only two fingers take the map.
  const interactive = !!(onPressCoordinate || onRegionChange);

  const responder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: (e) => interactive || touchCount(e) >= 2,
        onMoveShouldSetPanResponder: (e) => interactive || touchCount(e) >= 2,
        onPanResponderGrant: (e) => {
          const ne = e.nativeEvent as unknown as { locationX?: number; locationY?: number; offsetX?: number; offsetY?: number; touches?: { pageX: number; pageY: number }[] };
          gesture.current.x0 = ne.locationX ?? ne.offsetX ?? 0;
          gesture.current.y0 = ne.locationY ?? ne.offsetY ?? 0;
          gesture.current.moved = false;
          gesture.current.startView = live.current;
          gesture.current.startZoom = live.current.zoom;
          const touches = ne.touches ?? [];
          gesture.current.pinching = touches.length >= 2;
          if (touches.length >= 2) gesture.current.startDist = distance(touches[0], touches[1]);
        },
        onPanResponderMove: (e, g) => {
          const ne = e.nativeEvent as unknown as { touches?: { pageX: number; pageY: number }[] };
          const touches = ne.touches ?? [];
          const { width: w, height: h } = sizeRef.current;
          if (w === 0) return;
          // Two fingers: pinch to zoom, around the middle of the map.
          // The second finger may land after the first: the pinch starts from the spread at that moment.
          if (touches.length >= 2 && gesture.current.startDist === 0) {
            gesture.current.startDist = distance(touches[0], touches[1]);
            gesture.current.startZoom = live.current.zoom;
            gesture.current.startView = live.current;
          }
          if (touches.length >= 2 && gesture.current.startDist > 0) {
            gesture.current.pinching = true;
            gesture.current.moved = true;
            const factor = distance(touches[0], touches[1]) / gesture.current.startDist;
            const nextZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Math.round(gesture.current.startZoom + Math.log2(factor))));
            if (nextZoom !== live.current.zoom) setView({ center: gesture.current.startView.center, zoom: nextZoom });
            return;
          }
          // One finger: drag to pan. The point under the middle moves with the finger.
          if (Math.abs(g.dx) + Math.abs(g.dy) > TAP_SLOP_PX) {
            gesture.current.moved = true;
            const start = gesture.current.startView;
            const c = mapPointToLatLng(w / 2 - g.dx, h / 2 - g.dy, start.center, start.zoom, w, h);
            setView({ center: c, zoom: start.zoom });
          }
        },
        onPanResponderRelease: () => {
          const { width: w, height: h } = sizeRef.current;
          const cb = callbacks.current;
          if (gesture.current.moved) {
            cb.onRegionChange?.(live.current.center, live.current.zoom);
            return;
          }
          if (w === 0) return;
          const x = gesture.current.x0;
          const y = gesture.current.y0;
          if (!Number.isFinite(x) || !Number.isFinite(y)) return;
          const now = Date.now();
          const prev = lastTap.current;
          const v = live.current;
          // A double tap zooms in one step, centred on the spot tapped.
          if (prev && now - prev.t < DOUBLE_TAP_MS && Math.hypot(prev.x - x, prev.y - y) < DOUBLE_TAP_PX && v.zoom < MAX_ZOOM) {
            lastTap.current = null;
            const c = mapPointToLatLng(x, y, v.center, v.zoom, w, h);
            const next = { center: c, zoom: v.zoom + 1 };
            setView(next);
            cb.onRegionChange?.(next.center, next.zoom);
            return;
          }
          lastTap.current = { t: now, x, y };
          cb.onPressCoordinate?.(mapPointToLatLng(x, y, v.center, v.zoom, w, h));
        },
        onPanResponderTerminate: () => {
          if (gesture.current.moved) callbacks.current.onRegionChange?.(live.current.center, live.current.zoom);
        },
      }),
    [interactive]
  );

  const project: Project = (point) => {
    const p = projectToMap(point, view.center, view.zoom, size.width, size.height);
    const inside = p.x >= 0 && p.y >= 0 && p.x <= size.width && p.y <= size.height;
    return inside ? p : null;
  };

  return (
    <View style={[styles.container, style]} onLayout={(e) => setSize(e.nativeEvent.layout)} {...responder.panHandlers}>
      {MAP_PROVIDER === 'osm' ? (
        <OsmTiles center={view.center} zoom={view.zoom} width={size.width} height={size.height} />
      ) : url && !failed ? (
        <Image source={{ uri: url }} style={StyleSheet.absoluteFill} resizeMode="cover" onError={() => setFailed(true)} />
      ) : (
        <DotGrid color={fallbackColor} spacing={28} opacity={0.22} />
      )}

      {size.width > 0 && renderOverlay?.(project)}
      {children}
    </View>
  );
};

const styles = themedStyles(() => StyleSheet.create({
  container: { backgroundColor: Colors.mapBg, overflow: 'hidden' },
}));
