import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Modal, Animated, Easing, useWindowDimensions } from 'react-native';
import { Colors, getThemeMode, themedStyles } from '@ongarage/shared';
import { FONTS } from '@ongarage/shared';
import { MOCK_USER } from '../constants/mockData';
import { useVehicles } from '../context/VehiclesContext';
import { vehicleIcon } from '@ongarage/shared';
import { Gradient, GRADIENTS } from '@ongarage/shared';
import { useUserLocation } from '../context/LocationContext';
import { VehicleTurntable } from './VehicleTurntable';

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
  if (hour < 12) return 'සුභ උදෑසනක් 🌅';
  if (hour < 17) return 'සුභ දහවලක් ☀️';
  if (hour < 20) return 'සුභ සන්ධ්‍යාවක් 🌅';
  return 'සුභ රාත්‍රියක් 🌙';
};

interface HeaderProps {
  activeVehicle: string;
  onVehicleChange: (vehicleId: string) => void;
}

export const Header: React.FC<HeaderProps> = ({ activeVehicle, onVehicleChange }) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const triggerRef = useRef<View>(null);
  const activeCar = useVehicles().findVehicle(activeVehicle);
  const { locality, status } = useUserLocation();

  return (
    <View style={styles.header}>
      <View style={styles.brandBox}>
        <VehicleTurntable vehicleId={activeCar.id} icon={vehicleIcon(activeCar.type)} onPress={() => setShowDropdown(true)} />
        <View style={styles.greetingText}>
          <Text style={styles.greeting} numberOfLines={1}>
            {greetingFor(new Date().getHours())} 👋
          </Text>
          <Text style={styles.userName} numberOfLines={1}>
            {MOCK_USER.firstName} {MOCK_USER.lastName}
          </Text>
          <Text style={styles.location} numberOfLines={1}>
            📍 {status === 'locating' ? 'ස්ථානය සොයමින්...' : locality}
          </Text>
        </View>
      </View>

      <Pressable
        ref={triggerRef}
        style={[styles.vehicleDropdown, showDropdown && styles.vehicleDropdownOpen]}
        onPress={() => setShowDropdown(true)}
      >
        <Text style={styles.vehicleIcon}>{vehicleIcon(activeCar.type)}</Text>
        <Text style={styles.vehicleLabel}>{`${activeCar.name} (${activeCar.plate})`}</Text>
        <Text style={[styles.dropdownArrow, showDropdown && { transform: [{ rotate: '180deg' }] }]}>▾</Text>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: Colors.bgBody,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderColor,
  },
  brandBox: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1, marginRight: 8 },
  greetingText: { flexShrink: 1 },
  greeting: { fontSize: 10.5, color: Colors.textMuted, fontFamily: FONTS.bodyRegular },
  userName: { fontSize: 16, fontFamily: FONTS.titleBold, color: Colors.textMain, marginTop: 2 },
  location: { fontSize: 9.5, color: Colors.textMuted, fontFamily: FONTS.bodyRegular, marginTop: 1 },
  vehicleDropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.25)',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  vehicleDropdownOpen: { borderColor: 'rgba(56, 189, 248, 0.6)', backgroundColor: 'rgba(56, 189, 248, 0.16)' },
  vehicleIcon: { fontSize: 12 },
  vehicleLabel: { color: Colors.primary, fontSize: 11, fontWeight: '700' },
  dropdownArrow: { fontSize: 9, color: Colors.primary, marginLeft: 2 },

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
