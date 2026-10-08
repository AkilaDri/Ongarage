import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Colors, FONTS, LevelBadge, Pulse, themedStyles, softShadow, headerBand, getThemeMode } from '@ongarage/shared';
import { useGarage } from '../context/GarageContext';

const greetingFor = (hour: number) => {
  if (hour < 12) return 'සුභ උදෑසනක් 🌅';
  if (hour < 17) return 'සුභ දහවලක් ☀️';
  if (hour < 20) return 'සුභ සන්ධ්‍යාවක් 🌅';
  return 'සුභ රාත්‍රියක් 🌙';
};

// Same layout as the owner app's header; the garage badge pulses while the
// garage is online and the right-hand pill switches availability.
export const GarageHeader: React.FC = () => {
  const { profile, isOpen, setOpen, level } = useGarage();
  const initials = profile.name.replace(/[^A-Za-z]/g, '').slice(0, 3).toUpperCase();

  return (
    <View style={styles.header}>
      <View style={styles.brandBox}>
        <View style={styles.badgeWrap}>
          {isOpen && <Pulse style={styles.pulseRing} maxScale={1.25} />}
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{initials}</Text>
          </View>
          <View style={[styles.statusDot, { backgroundColor: isOpen ? '#22c55e' : Colors.textMuted }]} />
        </View>
        <View style={styles.flexShrink}>
          <Text style={styles.greeting} numberOfLines={1}>
            {greetingFor(new Date().getHours())}
          </Text>
          <Text style={styles.name} numberOfLines={1}>
            {profile.name}
          </Text>
          <View style={styles.nameRow}>
            <LevelBadge level={level.id} compact />
            <Text style={[styles.location, styles.flexShrink]} numberOfLines={1}>
              📍 {profile.address}
            </Text>
          </View>
        </View>
      </View>

      <Pressable
        style={({ pressed }) => [styles.statusPill, isOpen ? styles.statusPillOn : styles.statusPillOff, pressed && { transform: [{ scale: 0.96 }] }]}
        onPress={() => setOpen(!isOpen)}
        accessibilityRole="switch"
        accessibilityState={{ checked: isOpen }}
      >
        <View style={[styles.pillDot, { backgroundColor: isOpen ? '#22c55e' : Colors.textMuted }]} />
        <Text style={[styles.pillText, { color: isOpen ? Colors.success : Colors.textMuted }]}>{isOpen ? 'සබැඳියි' : 'නොබැඳියි'}</Text>
      </Pressable>
    </View>
  );
};

const styles = themedStyles(() =>
  StyleSheet.create({
    nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 18, paddingTop: 12, paddingBottom: 30, backgroundColor: headerBand().bg },
    brandBox: { flexDirection: 'row', alignItems: 'center', gap: 12, flexShrink: 1, marginRight: 8 },
    flexShrink: { flexShrink: 1 },
    badgeWrap: { width: 52, height: 52, justifyContent: 'center', alignItems: 'center' },
    pulseRing: { position: 'absolute', width: 52, height: 52, borderRadius: 26, borderWidth: 2, borderColor: 'rgba(34, 197, 94, 0.55)' },
    badge: { width: 46, height: 46, borderRadius: 23, backgroundColor: '#ffffff', justifyContent: 'center', alignItems: 'center', ...softShadow() },
    badgeText: { fontSize: 13, fontWeight: '900', color: Colors.success, letterSpacing: 0.5 },
    statusDot: { position: 'absolute', right: 1, bottom: 1, width: 13, height: 13, borderRadius: 7, borderWidth: 2.5, borderColor: headerBand().bg },
    greeting: { fontSize: 11.5, color: headerBand().sub, fontFamily: FONTS.bodyMedium },
    name: { fontSize: 16, fontFamily: FONTS.titleBold, color: headerBand().title, marginTop: 1 },
    location: { fontSize: 10, color: headerBand().sub, fontFamily: FONTS.bodyRegular, marginTop: 1 },
    statusPill: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 7, backgroundColor: getThemeMode() === 'dark' ? headerBand().pill : '#ffffff', ...softShadow() },
    statusPillOn: {},
    statusPillOff: {},
    pillDot: { width: 8, height: 8, borderRadius: 4 },
    pillText: { fontSize: 11, fontFamily: FONTS.bodySemiBold },
  })
);
