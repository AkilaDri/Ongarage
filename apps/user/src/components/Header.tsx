import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Modal, Animated, Easing, useWindowDimensions } from 'react-native';
import { Colors, getThemeMode, themedStyles } from '@ongarage/shared';
import { FONTS } from '@ongarage/shared';
import { useProfile } from '../context/ProfileContext';
import { useVehicles } from '../context/VehiclesContext';
import { vehicleIcon } from '@ongarage/shared';
import { Gradient, GRADIENTS } from '@ongarage/shared';
import WeatherAnimation, { periodOf, skyInk } from './WeatherAnimation';
import { MOCK_USER } from '../constants/mockData';

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
                    <Text style={styles.iconText}>{vehicleIcon(vehicle.type)}</Text>
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
  const hour = new Date().getHours();
  return (
    <View style={styles.titleBand}>
      <WeatherAnimation hour={hour} bodyRight={action ? 150 : 24} />
      <Text style={[styles.titleBandText, { color: skyInk(periodOf(hour)).main }, action && styles.titleWithAction]} accessibilityRole="header">
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

interface HeaderProps {
  activeVehicle: string;
  onVehicleChange: (vehicleId: string) => void;
}

export const Header: React.FC<HeaderProps> = ({ activeVehicle, onVehicleChange }) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const triggerRef = useRef<View>(null);
  const activeCar = useVehicles().findVehicle(activeVehicle);
  const { fullName, profile } = useProfile();

  const hour = new Date().getHours();
  const night = periodOf(hour) === 'night';

  return (
    <View style={styles.header}>
      <WeatherAnimation hour={hour} />
      <View style={styles.greetingRow}>
        <View style={styles.greetingText}>
          <Text style={[styles.city, night ? styles.cityNight : styles.cityDay]}>📍 {MOCK_USER.city}</Text>
          <Text style={[styles.hi, night ? styles.hiNight : styles.hiDay]} numberOfLines={1}>
            Hi {fullName},
          </Text>
          <Text style={[styles.greeting, night ? styles.greetingNight : styles.greetingDay]} numberOfLines={1}>
            {greetingFor(hour)}
          </Text>
        </View>
      </View>

      <Pressable ref={triggerRef} style={[styles.vehiclePill, showDropdown && styles.vehiclePillOpen]} onPress={() => setShowDropdown(true)} accessibilityLabel="Change vehicle">
        <View style={styles.pillCar}>
          <Text style={styles.pillCarIcon}>{vehicleIcon(activeCar.type)}</Text>
        </View>
        <Text style={styles.pillLabel} numberOfLines={1}>
          {activeCar.plate}
        </Text>
        <Text style={styles.pillArrow}>▾</Text>
      </Pressable>

      <VehiclePicker
        visible={showDropdown}
        activeVehicle={activeVehicle}
        anchorRef={triggerRef}
        onSelect={onVehicleChange}
        onClose={() => setShowDropdown(false)}
      />
    </View>
  );
};

const styles = themedStyles(() => StyleSheet.create({
  // A soft sky-blue band (dark text on light, light text on dark); the screen below overlaps it.
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 34,
    overflow: 'hidden',
    backgroundColor: getThemeMode() === 'dark' ? '#0e2a3f' : '#bfe4fa',
  },
  // The sky behind the greeting is light by day and dark at night in either theme, so the text colour follows it.
  cityDay: { color: '#2b4a63' },
  hiDay: { color: '#0f2a3d' },
  greetingDay: { color: '#2b4a63' },
  cityNight: { color: '#a9cbe6' },
  hiNight: { color: '#e6f3fc' },
  greetingNight: { color: '#a9cbe6' },
  titleBandAction: { paddingHorizontal: 14, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: getThemeMode() === 'dark' ? '#16415f' : '#0f2f4a' },
  titleBandActionText: { fontSize: 12, fontFamily: FONTS.bodySemiBold, color: '#ffffff' },
  // Leaves room for the sun / moon between the title and the action button.
  titleWithAction: { flexShrink: 1, maxWidth: '44%' },
  titleBand: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingHorizontal: 18, paddingTop: 14, paddingBottom: 34, overflow: 'hidden', backgroundColor: getThemeMode() === 'dark' ? '#0e2a3f' : '#bfe4fa' },
  titleBandText: { fontSize: 20, fontFamily: FONTS.titleBold, color: getThemeMode() === 'dark' ? '#d6eefc' : '#0f2a3d' },
  city: { fontSize: 10.5, fontFamily: FONTS.bodyRegular, color: getThemeMode() === 'dark' ? '#8fc3e3' : '#2b4a63', marginBottom: 2 },
  greetingRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
  greetingText: { gap: 1, flex: 1 },
  hi: { fontSize: 15, fontFamily: FONTS.titleBold, color: getThemeMode() === 'dark' ? '#d6eefc' : '#0f2a3d' },
  greeting: { fontSize: 12.5, fontFamily: FONTS.bodyMedium, color: getThemeMode() === 'dark' ? '#8fc3e3' : '#2b4a63' },
  vehiclePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 5,
    paddingLeft: 5,
    paddingRight: 12,
    borderRadius: 22,
    backgroundColor: getThemeMode() === 'dark' ? '#16415f' : '#0f2f4a',
  },
  vehiclePillOpen: { opacity: 0.85 },
  pillCar: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#d6eefc', alignItems: 'center', justifyContent: 'center' },
  pillCarIcon: { fontSize: 16 },
  pillLabel: { fontSize: 12, fontFamily: FONTS.bodyBold, color: '#fff', letterSpacing: 0.5 },
  pillArrow: { fontSize: 10, color: '#bfe4fa' },

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
