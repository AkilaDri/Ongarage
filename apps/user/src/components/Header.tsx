import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Image, Text, StyleSheet, Pressable, Modal, Animated, Easing, useWindowDimensions } from 'react-native';
import { Colors, getThemeMode, themedStyles } from '@ongarage/shared';
import { FONTS } from '@ongarage/shared';
import { useProfile } from '../context/ProfileContext';
import { useVehicles } from '../context/VehiclesContext';
import { VehicleIcon3D } from '@ongarage/shared';
import { Gradient, GRADIENTS } from '@ongarage/shared';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';
import WeatherAnimation, { periodOf, useHour } from './WeatherAnimation';
import { MOCK_USER } from '../constants/mockData';

/** Every page's top band is this tall - the height of Home's greeting band. */
export const HEADER_BAND_H = 100;
// The top bar keeps its emoji as they are (the line-icon patch skips a Text marked this way).
const KEEP_EMOJI = { keepEmoji: true } as object;
const POPOVER_WIDTH = 264;
const EDGE_GAP = 12;

interface VehiclePickerProps {
  visible: boolean;
  activeVehicle: string;
  anchorRef: React.RefObject<View | null>;
  onSelect: (vehicleId: string) => void;
  onClose: () => void;
}

type Placement = { top: number; left: number; originX: number };

export const VehiclePicker: React.FC<VehiclePickerProps> = ({ visible, activeVehicle, anchorRef, onSelect, onClose }) => {
  const { width: screenW } = useWindowDimensions();
  const [placement, setPlacement] = useState<Placement | null>(null);
  const progress = useRef(new Animated.Value(0)).current;
  const { vehicles } = useVehicles();
  const rows = useMemo(() => vehicles.map(() => new Animated.Value(0)), [vehicles.length]);
  const closing = useRef(false);

  useEffect(() => {
    if (!visible) {
      setPlacement(null);
      return;
    }
    closing.current = false;
    const place = (x: number, y: number, w: number, h: number) => {
      const anchorRight = x + w;
      const left = Math.min(Math.max(anchorRight - POPOVER_WIDTH, EDGE_GAP), screenW - POPOVER_WIDTH - EDGE_GAP);
      setPlacement({ top: y + h + 8, left, originX: Math.min(Math.max(anchorRight - left - 24, 24), POPOVER_WIDTH - 24) });
    };
    if (anchorRef.current) anchorRef.current.measureInWindow(place);
    else place(screenW - EDGE_GAP, 56, 0, 0);
  }, [visible, anchorRef, screenW]);

  useEffect(() => {
    if (!placement) return;
    progress.setValue(0);
    rows.forEach((r) => r.setValue(0));
    Animated.parallel([
      Animated.timing(progress, { toValue: 1, duration: 280, easing: Easing.bezier(0.16, 1, 0.3, 1), useNativeDriver: true }),
      Animated.stagger(
        45,
        rows.map((r) =>
          Animated.timing(r, { toValue: 1, duration: 240, delay: 60, easing: Easing.out(Easing.cubic), useNativeDriver: true })
        )
      ),
    ]).start();
  }, [placement, progress, rows]);

  const close = () => {
    if (closing.current) return;
    closing.current = true;
    Animated.timing(progress, { toValue: 0, duration: 170, easing: Easing.in(Easing.cubic), useNativeDriver: true }).start(
      () => onClose()
    );
  };

  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent onRequestClose={close}>
      <Animated.View style={[styles.backdrop, { opacity: progress }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={close} />
      </Animated.View>

      {placement && (
        <Animated.View
          style={[
            styles.popover,
            {
              top: placement.top,
              left: placement.left,
              transformOrigin: `${placement.originX}px 0px`,
              opacity: progress,
              transform: [
                { translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [-8, 0] }) },
                { scale: progress.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] }) },
              ],
            },
          ]}
        >
          <View style={[styles.caret, { left: placement.originX - 6 }]} />

          <View style={styles.titleRow}>
            <Text style={styles.title}>ඔබගේ වාහනයන්</Text>
            <View style={styles.countPill}>
              <Text style={styles.countText}>{vehicles.length}</Text>
            </View>
          </View>

          {vehicles.map((vehicle, i) => {
            const active = activeVehicle === vehicle.id;
            return (
              <Animated.View
                key={vehicle.id}
                style={{
                  opacity: rows[i],
                  transform: [{ translateY: rows[i].interpolate({ inputRange: [0, 1], outputRange: [6, 0] }) }],
                }}
              >
                <Pressable
                  style={({ pressed }) => [styles.row, active && styles.rowActive, pressed && !active && styles.rowPressed]}
                  onPress={() => {
                    onSelect(vehicle.id);
                    close();
                  }}
                >
                  <View style={[styles.iconTile, active && styles.iconTileActive]}>
                    {active && <Gradient stops={GRADIENTS.issue} />}
                    <VehicleIcon3D type={vehicle.type} size={30} />
                  </View>
                  <View style={styles.rowText}>
                    <Text style={[styles.name, active && styles.nameActive]}>{vehicle.name}</Text>
                    <Text style={styles.plate}>
                      {vehicle.plate} · {vehicle.type}
                    </Text>
                  </View>
                  {active ? (
                    <View style={styles.check}>
                      <Text style={styles.checkText}>✓</Text>
                    </View>
                  ) : (
                    <View style={styles.radio} />
                  )}
                </Pressable>
              </Animated.View>
            );
          })}
        </Animated.View>
      )}
    </Modal>
  );
};

const greetingFor = (hour: number) => {
  if (hour < 12) return 'සුභ උදෑසනක්';
  if (hour < 17) return 'සුභ දහවලක්';
  if (hour < 20) return 'සුභ සන්ධ්‍යාවක්';
  return 'සුභ රාත්‍රියක්';
};

/** The band other tabs show instead of the greeting: just the tab's title, same colour as Home's. */
export const TitleBand: React.FC<{ title: string; action?: { label: string; onPress: () => void } }> = ({ title, action }) => {
  const hour = useHour();
  return (
    <View style={styles.titleBand}>
      <WeatherAnimation hour={hour} />
      <Text style={[styles.titleBandText, { color: '#ffffff' }, action && styles.titleWithAction]} accessibilityRole="header">
        {title}
      </Text>
      {action && (
        <Pressable style={styles.titleBandAction} onPress={action.onPress} accessibilityLabel={action.label}>
          <Text style={styles.titleBandActionText}>{action.label}</Text>
        </Pressable>
      )}
    </View>
  );
};

/** A soft round glow (the design's blurred circles): a radial gradient that fades to nothing. */
const Glow: React.FC<{ size: number; color: string; opacity: number; style: object }> = ({ size, color, opacity, style }) => (
  <Svg width={size} height={size} style={[{ position: 'absolute' }, style]} pointerEvents="none">
    <Defs>
      <RadialGradient id="glow" cx="50%" cy="50%" r="50%">
        <Stop offset="0" stopColor={color} stopOpacity={opacity} />
        <Stop offset="1" stopColor={color} stopOpacity={0} />
      </RadialGradient>
    </Defs>
    <Circle cx={size / 2} cy={size / 2} r={size / 2} fill="url(#glow)" />
  </Svg>
);

export const Header: React.FC<{ vehicleId?: string; onSelectVehicle?: (id: string) => void }> = ({ vehicleId, onSelectVehicle }) => {
  const { fullName } = useProfile();
  const { findVehicle } = useVehicles();
  const vehicle = vehicleId ? findVehicle(vehicleId) : undefined;
  const hour = useHour();
  const [pickerOpen, setPickerOpen] = useState(false);
  const anchorRef = useRef<View>(null);

  return (
    <View style={hh.wrap}>
      <Gradient stops={[{ offset: '0', color: '#1e3a8a' }, { offset: '0.5', color: '#2563eb' }, { offset: '1', color: '#3b82f6' }]} />
      <Glow size={200} color="#93c5fd" opacity={0.5} style={{ right: -60, top: -60 }} />
      <Glow size={160} color="#facc15" opacity={0.26} style={{ left: 0, bottom: -20 }} />
      <View style={hh.topRow}>
        <View style={hh.cityPill}>
          <Text style={hh.cityPin}>📍</Text>
          <Text style={hh.cityText}>{MOCK_USER.city}</Text>
        </View>
        <Image source={require('../../assets/ongarage-logo.png')} style={hh.logo} resizeMode="contain" accessibilityLabel="OnGarage" />
      </View>
      <Text style={hh.hi} numberOfLines={1}>
        Hi {fullName},
      </Text>
      <View style={hh.vehicleRow} accessibilityLabel={vehicle ? `Your vehicle ${vehicle.name} ${vehicle.plate}` : 'Your vehicle'}>
        <Text style={hh.ready}>ඔබේ වාහනය</Text>
        {vehicle && (
          <>
            <Text style={hh.vehicleName} numberOfLines={1}>
              {vehicle.name}
            </Text>
            {/* The number plate with a small arrow: touch it to choose another vehicle. */}
            <Pressable ref={anchorRef} style={hh.plateBtn} onPress={() => setPickerOpen(true)} hitSlop={8} accessibilityLabel="Choose another vehicle">
              <View style={hh.plate}>
                <Text style={hh.plateText}>{vehicle.plate}</Text>
              </View>
              <Text style={hh.plateArrow}>⌄</Text>
            </Pressable>
          </>
        )}
      </View>
      {vehicleId && (
        <VehiclePicker
          visible={pickerOpen}
          activeVehicle={vehicleId}
          anchorRef={anchorRef}
          onSelect={(id) => onSelectVehicle?.(id)}
          onClose={() => setPickerOpen(false)}
        />
      )}
    </View>
  );
};

/** The Home header band, written with plain styles so it matches the design exactly. */
const hh = StyleSheet.create({
  wrap: { paddingHorizontal: 24, paddingTop: 20, paddingBottom: 72, borderBottomLeftRadius: 36, borderBottomRightRadius: 36, overflow: 'hidden', backgroundColor: '#2563eb' },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  cityPill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, backgroundColor: 'rgba(255, 255, 255, 0.15)', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.15)' },
  cityPin: { fontSize: 13.5, color: '#facc15' },
  cityText: { fontSize: 13.5, fontFamily: FONTS.bodySemiBold, letterSpacing: 0.3, color: '#ffffff' },
  vehiclePill: { flexShrink: 1, flexDirection: 'row', alignItems: 'center', gap: 6, marginLeft: 10, paddingLeft: 12, paddingRight: 8, paddingVertical: 5, borderRadius: 20, backgroundColor: 'rgba(255, 255, 255, 0.15)', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.2)' },
  vehicleIcon: { fontSize: 13.5 },
  plate: { paddingHorizontal: 2, paddingVertical: 1 },
  plateText: { fontSize: 13.5, fontWeight: '800', letterSpacing: 0.3, color: '#ffffff' },
  cityChevron: { fontSize: 19, lineHeight: 19, color: '#facc15', marginTop: -6 },
  logoPill: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 4, borderRadius: 20, backgroundColor: 'rgba(255, 255, 255, 0.15)', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.2)' },
  logoDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#facc15', marginRight: 8 },
  logoText: { fontSize: 12, fontWeight: '800', letterSpacing: 0.6, color: '#ffffff' },
  logoG: { fontSize: 14, fontWeight: '900', color: '#facc15' },
  hi: { fontSize: 25, lineHeight: 33, fontFamily: FONTS.titleBold, letterSpacing: -0.3, color: '#ffffff' },
  logo: { width: 86, height: 26 },
  vehicleRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  vehicleName: { flexShrink: 1, fontSize: 16, lineHeight: 22, fontFamily: FONTS.bodyBold, color: '#facc15' },
  plateBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  plateArrow: { fontSize: 22, lineHeight: 22, marginTop: -7, color: '#facc15' },
  ready: { fontSize: 16, lineHeight: 22, fontFamily: FONTS.bodySemiBold, color: '#facc15' },
  greeting: { fontSize: 18, lineHeight: 24, marginTop: 2, fontFamily: FONTS.bodyMedium, color: 'rgba(219, 234, 254, 0.9)' },
});

const styles = themedStyles(() => StyleSheet.create({
  // A soft sky-blue band (dark text on light, light text on dark); the screen below overlaps it.
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 22,
    paddingTop: 22,
    paddingBottom: 74,
    borderBottomLeftRadius: 36,
    borderBottomRightRadius: 36,
    minHeight: HEADER_BAND_H,
    overflow: 'hidden',
    backgroundColor: getThemeMode() === 'dark' ? '#0e2a3f' : '#2563eb',
  },
  // The sky behind the greeting is light by day and dark at night in either theme, so the text colour follows it.
  cityDay: { color: '#ffffff' },
  hiDay: { color: '#ffffff' },
  greetingDay: { color: '#d9d6d2' },
  cityNight: { color: '#a9cbe6' },
  hiNight: { color: '#e6f3fc' },
  greetingNight: { color: '#a9cbe6' },
  // Leaves room at the right for the floating chat icon (52px + its 14px margin), so the button never sits under it.
  titleBandAction: { marginRight: 66, paddingHorizontal: 14, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: getThemeMode() === 'dark' ? '#16415f' : '#0f2f4a' },
  titleBandActionText: { fontSize: 12, fontFamily: FONTS.bodySemiBold, color: '#ffffff' },
  // Leaves room for the sun / moon between the title and the action button.
  titleWithAction: { flexShrink: 1, maxWidth: '44%' },
  titleBand: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingHorizontal: 18, paddingTop: 14, paddingBottom: 34, minHeight: HEADER_BAND_H, overflow: 'hidden', backgroundColor: getThemeMode() === 'dark' ? '#0e2a3f' : '#2563eb' },
  titleBandText: { fontSize: 20, fontFamily: FONTS.titleBold, color: getThemeMode() === 'dark' ? '#d6eefc' : '#ffffff' },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  cityPill: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.13)' },
  cityPin: { fontSize: 13, color: '#2563eb' },
  cityChevron: { fontSize: 13, color: '#e8e2d0', marginTop: -4 },
  city: { fontSize: 12.5, fontFamily: FONTS.bodyBold },
  // Above the sky: the sun, clouds and birds drift behind the greeting, never over it.
  greetingRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, position: 'relative' },
  greetingText: { gap: 4, flex: 1 },
  hi: { fontSize: 20, fontFamily: FONTS.titleBold, color: getThemeMode() === 'dark' ? '#d6eefc' : '#ffffff' },
  greeting: { fontSize: 13, fontFamily: FONTS.bodyMedium, color: getThemeMode() === 'dark' ? '#8fc3e3' : '#e8e2d0' },
  vehiclePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 5,
    paddingLeft: 5,
    paddingRight: 12,
    borderRadius: 22,
    // In front of the sky, so the sun / moon never covers the vehicle button.
    zIndex: 3,
    elevation: 3,
    backgroundColor: getThemeMode() === 'dark' ? '#16415f' : '#0f2f4a',
  },
  brandLogo: { width: 92, height: 27, marginTop: 2 },
  brandTag: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingVertical: 7, paddingHorizontal: 14, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.1)' },
  brandDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#2563eb' },
  brandText: { fontSize: 11.5, fontFamily: FONTS.bodyBold, letterSpacing: 1.2, color: '#facc15' },
  vehiclePillOpen: { opacity: 0.85 },
  pillCar: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#d6eefc', alignItems: 'center', justifyContent: 'center' },
  pillCarIcon: { fontSize: 16 },
  pillLabel: { fontSize: 12, fontFamily: FONTS.bodyBold, color: '#fff', letterSpacing: 0.5 },
  pillArrow: { fontSize: 10, color: '#facc15' },

  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: Colors.overlay },
  popover: {
    position: 'absolute',
    width: POPOVER_WIDTH,
    backgroundColor: Colors.bgCard,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.borderColor,
    padding: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: getThemeMode() === 'dark' ? 0.55 : 0.1,
    shadowRadius: 32,
    elevation: 18,
  },
  caret: {
    position: 'absolute',
    top: -6,
    width: 12,
    height: 12,
    backgroundColor: Colors.bgCard,
    borderLeftWidth: 1,
    borderTopWidth: 1,
    borderColor: Colors.borderColor,
    transform: [{ rotate: '45deg' }],
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingTop: 6,
    paddingBottom: 8,
  },
  title: { fontSize: 10, fontFamily: FONTS.bodySemiBold, color: Colors.textMuted, letterSpacing: 0.6, textTransform: 'uppercase' },
  countPill: {
    minWidth: 20,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 10,
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    alignItems: 'center',
  },
  countText: { fontSize: 10, fontWeight: '800', color: Colors.primary },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'transparent',
    marginBottom: 2,
  },
  rowActive: { backgroundColor: 'rgba(56, 189, 248, 0.1)', borderColor: 'rgba(56, 189, 248, 0.35)' },
  rowPressed: { backgroundColor: Colors.bgCardHover },
  iconTile: {
    width: 34,
    height: 34,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: Colors.bgDark,
    borderWidth: 1,
    borderColor: Colors.borderColor,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconTileActive: { borderWidth: 0 },
  iconText: { fontSize: 15 },
  rowText: { flex: 1 },
  name: { fontSize: 12.5, fontFamily: FONTS.bodySemiBold, color: Colors.textMain },
  nameActive: { color: Colors.textMain },
  plate: { fontSize: 10, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, letterSpacing: 0.3, marginTop: 1 },
  check: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkText: { fontSize: 10.5, fontWeight: '900', color: Colors.bgDark },
  radio: { width: 18, height: 18, borderRadius: 9, borderWidth: 1.5, borderColor: Colors.subtleBorder },
}));
