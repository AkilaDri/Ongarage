import React, { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { FONTS, getThemeMode, themedStyles, vehicleIcon } from '@ongarage/shared';
import { useUserLocation } from '../../context/LocationContext';
import { useVehicles } from '../../context/VehiclesContext';
import { VehiclePicker } from '../Header';
import WeatherAnimation, { periodOf, skyInk } from '../WeatherAnimation';

/**
 * OnMart's top band, in the owner Home's style: a round shop badge, the marketplace name with where the owner is,
 * and the active vehicle (parts are matched to it) with the same picker as Home.
 */
export const MartHeader: React.FC<{ activeVehicle: string; onVehicleChange: (vehicleId: string) => void; onBack: () => void }> = ({ activeVehicle, onVehicleChange, onBack }) => {
  const { locality } = useUserLocation();
  const car = useVehicles().findVehicle(activeVehicle);
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<View>(null);

  const hour = new Date().getHours();
  const ink = skyInk(periodOf(hour));

  return (
    <View style={styles.header}>
      <WeatherAnimation hour={hour} />
      <View style={styles.left}>
        <Pressable style={styles.back} onPress={onBack} accessibilityRole="button" accessibilityLabel="Back to main app">
          <Svg width={28} height={28} viewBox="0 0 24 24">
            <Path d="M19 12H5M11 5l-7 7 7 7" stroke={ink.main} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" fill="none" />
          </Svg>
        </Pressable>
        <View style={styles.badge}>
          <Text style={styles.badgeEmoji}>🛍️</Text>
        </View>
        <View style={styles.texts}>
          <Text style={[styles.title, { color: ink.main }]} numberOfLines={1}>
            OnMart
          </Text>
          <Text style={[styles.sub, { color: ink.sub }]} numberOfLines={1}>
            📍 {locality} · වාහන කොටස් වෙළඳපොළ
          </Text>
        </View>
      </View>

      <Pressable ref={triggerRef} style={[styles.pill, open && styles.pillOpen]} onPress={() => setOpen(true)} accessibilityLabel="Change vehicle">
        <View style={styles.pillCar}>
          <Text style={styles.pillCarIcon}>{vehicleIcon(car.type)}</Text>
        </View>
        <Text style={styles.pillLabel} numberOfLines={1}>
          {car.plate}
        </Text>
        <Text style={styles.pillArrow}>▾</Text>
      </Pressable>

      <VehiclePicker visible={open} activeVehicle={activeVehicle} anchorRef={triggerRef} onSelect={onVehicleChange} onClose={() => setOpen(false)} />
    </View>
  );
};

const dark = () => getThemeMode() === 'dark';

const styles = themedStyles(() =>
  StyleSheet.create({
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12, paddingHorizontal: 18, paddingTop: 12, paddingBottom: 34, overflow: 'hidden', backgroundColor: dark() ? '#0e2a3f' : '#bfe4fa' },
    left: { flexDirection: 'row', alignItems: 'center', gap: 10, flexShrink: 1 },
    back: { width: 40, height: 44, alignItems: 'center', justifyContent: 'center' },
    badge: { width: 44, height: 44, borderRadius: 22, backgroundColor: dark() ? '#16415f' : '#ffffff', alignItems: 'center', justifyContent: 'center' },
    badgeEmoji: { fontSize: 22 },
    texts: { flexShrink: 1, gap: 1 },
    title: { fontSize: 18, fontFamily: FONTS.titleBold, color: dark() ? '#d6eefc' : '#0f2a3d' },
    sub: { fontSize: 11, fontFamily: FONTS.bodyMedium, color: dark() ? '#8fc3e3' : '#2b4a63' },
    pill: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 5, paddingLeft: 5, paddingRight: 12, borderRadius: 22, backgroundColor: dark() ? '#16415f' : '#0f2f4a' },
    pillOpen: { opacity: 0.85 },
    pillCar: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#d6eefc', alignItems: 'center', justifyContent: 'center' },
    pillCarIcon: { fontSize: 16 },
    pillLabel: { fontSize: 12, fontFamily: FONTS.bodyBold, color: '#fff', letterSpacing: 0.5 },
    pillArrow: { fontSize: 10, color: '#bfe4fa' },
  })
);
