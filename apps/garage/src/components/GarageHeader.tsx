import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Colors, FONTS, LevelBadge, Pulse, themedStyles } from '@ongarage/shared';
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
    brandBox: { flexDirection: 'row', alignItems: 'center', gap: 12, flexShrink: 1, marginRight: 8 },
    flexShrink: { flexShrink: 1 },
    badgeWrap: { width: 52, height: 52, justifyContent: 'center', alignItems: 'center' },
    pulseRing: {
      position: 'absolute',
      width: 50,
      height: 50,
      borderRadius: 16,
      borderWidth: 2,
      borderColor: 'rgba(34, 197, 94, 0.55)',
    },
    badge: {
      width: 46,
      height: 46,
      borderRadius: 15,
      backgroundColor: Colors.glassBg,
      borderWidth: 1.5,
      borderColor: Colors.glassBorder,
      justifyContent: 'center',
      alignItems: 'center',
    },
    badgeText: { fontSize: 13, fontWeight: '900', color: Colors.success, letterSpacing: 0.5 },
    statusDot: {
      position: 'absolute',
      right: 1,
      bottom: 1,
      width: 13,
      height: 13,
      borderRadius: 7,
      borderWidth: 2.5,
      borderColor: Colors.bgBody,
    },
    greeting: { fontSize: 10.5, color: Colors.textMuted, fontFamily: FONTS.bodyRegular },
    name: { fontSize: 15, fontFamily: FONTS.titleBold, color: Colors.textMain, marginTop: 2 },
    location: { fontSize: 9.5, color: Colors.textMuted, fontFamily: FONTS.bodyRegular, marginTop: 1 },
    statusPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      borderWidth: 1,
      borderRadius: 10,
      paddingHorizontal: 10,
      paddingVertical: 6,
    },
    statusPillOn: { backgroundColor: 'rgba(16, 185, 129, 0.12)', borderColor: 'rgba(16, 185, 129, 0.4)' },
    statusPillOff: { backgroundColor: Colors.subtleFill, borderColor: Colors.subtleBorder },
    pillDot: { width: 8, height: 8, borderRadius: 4 },
    pillText: { fontSize: 11, fontFamily: FONTS.bodySemiBold },
  })
);
