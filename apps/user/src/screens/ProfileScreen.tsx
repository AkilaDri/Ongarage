import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Colors, themedStyles } from '@ongarage/shared';
import { FONTS } from '@ongarage/shared';
import { MOCK_USER } from '../constants/mockData';
import { useVehicles } from '../context/VehiclesContext';
import { vehicleIcon } from '@ongarage/shared';
import { AddVehicleSheet } from '../components/AddVehicleSheet';
import { Gradient, GRADIENTS } from '@ongarage/shared';
import { ActionButton, GlassIcon, ModalCard, glassStyle } from '@ongarage/shared';
import { useUserLocation } from '../context/LocationContext';
import { useTheme } from '@ongarage/shared';
import { ThemeToggle } from '@ongarage/shared';

const MENU = [
  { icon: '💳', label: 'ගෙවීම් ක්‍රම / කාඩ්පත්', sub: 'කාඩ්පත් සහ ගෙවීම් විකල්ප කළමනාකරණය' },
  { icon: '🛡️', label: 'සක්‍රීය ඩිජිටල් වගකීම්', sub: 'ඔබගේ අලුත්වැඩියා සඳහා වගකීම් පත්‍ර' },
  { icon: '⚙️', label: 'යෙදුම් සැකසුම්', sub: 'දැනුම්දීම්, භාෂාව සහ පෞද්ගලිකත්වය' },
];

interface ProfileScreenProps {
  activeVehicle: string;
  onVehicleChange: (vehicleId: string) => void;
}

export const ProfileScreen: React.FC<ProfileScreenProps> = ({ activeVehicle, onVehicleChange }) => {
  const { locality } = useUserLocation();
  const { isDark, toggle } = useTheme();
  const [comingSoon, setComingSoon] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const { vehicles, findVehicle } = useVehicles();
  const drive = useRef(new Animated.Value(0)).current;
  const vehicle = findVehicle(activeVehicle);
  const initials = `${MOCK_USER.firstName[0]}${MOCK_USER.lastName[0]}`;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(drive, { toValue: 1, duration: 1200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(drive, { toValue: 0, duration: 1200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [drive]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>පැතිකඩ</Text>
        <Text style={styles.sub}>ඔබගේ ගිණුම සහ වාහන</Text>
      </View>

      <ScrollView style={styles.flex1} contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <View style={[styles.card, styles.row]}>
          <View>
            <View style={styles.avatar}>
              <Gradient stops={GRADIENTS.brand} />
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
            <View style={styles.onlineDot} />
          </View>
          <View style={styles.flex1}>
            <Text style={styles.name}>
              {MOCK_USER.firstName} {MOCK_USER.lastName}
            </Text>
            <Text style={styles.sub}>📞 {MOCK_USER.phone}</Text>
            <Text style={styles.sub}>📍 {locality}</Text>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.rowBetween}>
            <Text style={styles.cardTitle}>මගේ වාහනය</Text>
            <Text style={styles.sub}>{vehicle.plate}</Text>
          </View>

          <View style={styles.row}>
            <View style={styles.garageBox}>
              <Animated.Text
                style={[
                  styles.car,
                  {
                    transform: [
                      { translateX: drive.interpolate({ inputRange: [0, 1], outputRange: [-10, 10] }) },
                      { translateY: drive.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, -4, 0] }) },
                      { scaleX: -1 },
                    ],
                  },
                ]}
              >
                {vehicleIcon(vehicle.type)}
              </Animated.Text>
              <View style={styles.road} />
            </View>
            <View style={styles.flex1}>
              <Text style={styles.vehicleName}>{vehicle.name}</Text>
              <Text style={styles.sub}>{vehicle.type}</Text>
              <View style={styles.plate}>
                <Text style={styles.plateText}>{vehicle.plate}</Text>
              </View>
            </View>
          </View>

          <View style={styles.divider} />
          <Text style={styles.sectionLabel}>මගේ වාහන ({vehicles.length})</Text>
          <View style={styles.chips}>
            {vehicles.map((v) => {
              const active = v.id === vehicle.id;
              return (
                <Pressable key={v.id} style={[styles.chip, active && styles.chipActive]} onPress={() => onVehicleChange(v.id)}>
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>
                    {vehicleIcon(v.type)} {v.name}
                  </Text>
                </Pressable>
              );
            })}
            <Pressable style={({ pressed }) => [styles.addChip, pressed && { transform: [{ scale: 0.95 }] }]} onPress={() => setAdding(true)}>
              <Text style={styles.addChipText}>＋ වාහනයක් එක් කරන්න</Text>
            </Pressable>
          </View>
        </View>

        <Text style={styles.sectionLabel}>පෙනුම</Text>
        <View style={[styles.card, styles.row]}>
          <GlassIcon emoji={isDark ? '🌙' : '☀️'} />
          <View style={styles.flex1}>
            <Text style={styles.cardTitle}>{isDark ? 'අඳුරු මාදිලිය' : 'ආලෝක මාදිලිය'}</Text>
            <Text style={styles.sub}>යෙදුමේ තේමාව අඳුරු / ආලෝක ලෙස මාරු කරන්න</Text>
          </View>
          <ThemeToggle isDark={isDark} onToggle={toggle} />
        </View>

        <Text style={styles.sectionLabel}>සැකසුම්</Text>
        <View style={styles.menu}>
          {MENU.map((m, i) => (
            <Pressable
              key={m.label}
              style={({ pressed }) => [styles.menuItem, i < MENU.length - 1 && styles.menuDivider, pressed && { backgroundColor: Colors.bgCardHover }]}
              onPress={() => setComingSoon(m.label)}
            >
              <GlassIcon emoji={m.icon} small />
              <View style={styles.flex1}>
                <Text style={styles.cardTitle}>{m.label}</Text>
                <Text style={styles.sub}>{m.sub}</Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.version}>OnGarage · v1.0.0</Text>
      </ScrollView>

      <AddVehicleSheet
        visible={adding}
        onClose={() => setAdding(false)}
        onAdded={(v) => {
          onVehicleChange(v.id);
          setAdding(false);
        }}
      />

      {comingSoon && (
        <ModalCard icon="🚧" tone="primary" title={comingSoon} body="මෙම විශේෂාංගය ඉක්මනින් පැමිණේ.">
          <ActionButton label="හරි" variant="primary" compact onPress={() => setComingSoon(null)} />
        </ModalCard>
      )}
    </View>
  );
};

const styles = themedStyles(() => StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bgBody },
  flex1: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  header: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.borderColor },
  headerTitle: { fontSize: 18, fontFamily: FONTS.titleBold, color: Colors.textMain },
  body: { padding: 16, gap: 14, paddingBottom: 100 },
  card: { backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.borderColor, borderRadius: 18, padding: 16, gap: 12 },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  avatarText: { fontSize: 20, fontWeight: '900', color: '#fff', letterSpacing: 1 },
  onlineDot: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 15,
    height: 15,
    borderRadius: 8,
    backgroundColor: '#22c55e',
    borderWidth: 2.5,
    borderColor: Colors.bgCard,
  },
  name: { fontSize: 17, fontFamily: FONTS.titleBold, color: Colors.textMain },
  sub: { fontSize: 11, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, marginTop: 1 },
  cardTitle: { fontSize: 13, fontFamily: FONTS.titleBold, color: Colors.textMain },
  sectionLabel: { fontSize: 11, fontFamily: FONTS.bodySemiBold, color: Colors.textMuted, letterSpacing: 0.5 },
  garageBox: {
    width: 110,
    height: 84,
    borderRadius: 20,
    ...glassStyle(),
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  car: { fontSize: 46 },
  road: {
    position: 'absolute',
    left: 10,
    right: 10,
    bottom: 14,
    borderBottomWidth: 2,
    borderStyle: 'dashed',
    borderColor: Colors.subtleBorder,
  },
  vehicleName: { fontSize: 18, fontFamily: FONTS.titleBold, color: Colors.primary },
  plate: {
    alignSelf: 'flex-start',
    marginTop: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.4)',
  },
  plateText: { fontSize: 12, fontWeight: '800', color: Colors.primary, letterSpacing: 1 },
  divider: { height: 1, backgroundColor: Colors.borderColor },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 16, borderWidth: 1, borderColor: Colors.borderColor, backgroundColor: Colors.subtleFill },
  chipActive: { borderColor: Colors.primary, backgroundColor: 'rgba(56, 189, 248, 0.14)' },
  chipText: { fontSize: 11.5, fontFamily: FONTS.bodyMedium, color: Colors.textMuted },
  chipTextActive: { color: Colors.primary, fontFamily: FONTS.bodySemiBold },
  addChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: Colors.primary,
    backgroundColor: 'rgba(56, 189, 248, 0.08)',
  },
  addChipText: { fontSize: 11.5, fontFamily: FONTS.bodySemiBold, color: Colors.primary },
  menu: { backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.borderColor, borderRadius: 18, overflow: 'hidden' },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 12 },
  menuDivider: { borderBottomWidth: 1, borderBottomColor: Colors.borderColor },
  chevron: { fontSize: 22, color: Colors.textMuted },
  version: { fontSize: 10.5, fontFamily: FONTS.bodyRegular, color: 'rgba(148, 163, 184, 0.5)', textAlign: 'center', marginTop: 4 },
}));
