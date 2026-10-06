import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Colors, FONTS, Pulse, themedStyles } from '@ongarage/shared';
import { useTech } from '../context/TechContext';
import { DutySheet } from './DutySheet';

const greetingFor = (hour: number) => {
  if (hour < 12) return 'සුභ උදෑසනක් 🌅';
  if (hour < 17) return 'සුභ දහවලක් ☀️';
  if (hour < 20) return 'සුභ සන්ධ්‍යාවක් 🌅';
  return 'සුභ රාත්‍රියක් 🌙';
};

// Same layout as the other apps' headers. The pill shows where the technician is on
// duty (or on a break, or off) and opens check-in / break / check-out.
export const TechHeader: React.FC = () => {
  const { profile, duty, links } = useTech();
  const [open, setOpen] = useState(false);
  const garage = links.find((l) => l.garage.id === duty.garageId)?.garage;
  const state = !duty.garageId ? 'off' : duty.onBreak ? 'break' : 'on';
  const tone = { on: Colors.success, break: Colors.warning, off: Colors.textMuted }[state];

  return (
    <View style={styles.header}>
      <View style={styles.brandBox}>
        <View style={styles.badgeWrap}>
          {state === 'on' && <Pulse style={styles.pulseRing} maxScale={1.25} />}
          <View style={styles.badge}>
            <Text style={styles.badgeEmoji}>👨‍🔧</Text>
          </View>
          <View style={[styles.statusDot, { backgroundColor: state === 'on' ? '#22c55e' : state === 'break' ? '#f59e0b' : Colors.textMuted }]} />
        </View>
        <View style={styles.flexShrink}>
          <Text style={styles.greeting} numberOfLines={1}>
            {greetingFor(new Date().getHours())}
          </Text>
          <Text style={styles.name} numberOfLines={1}>
            {profile.name}
          </Text>
          <Text style={styles.location} numberOfLines={1}>
            {garage ? `🛠️ ${garage.name}` : `${profile.role} · රාජකාරියෙන් පිට`}
          </Text>
        </View>
      </View>

      <Pressable
        style={({ pressed }) => [styles.statusPill, state === 'on' ? styles.pillOn : state === 'break' ? styles.pillBreak : styles.pillOff, pressed && { transform: [{ scale: 0.96 }] }]}
        onPress={() => setOpen(true)}
        accessibilityLabel="Duty status"
      >
        <View style={[styles.pillDot, { backgroundColor: tone }]} />
        <Text style={[styles.pillText, { color: tone }]}>{state === 'on' ? 'රාජකාරියේ' : state === 'break' ? 'විවේකයේ' : 'පිටත'}</Text>
      </Pressable>
      <DutySheet visible={open} onClose={() => setOpen(false)} />
    </View>
  );
};

const styles = themedStyles(() =>
  StyleSheet.create({
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
    pulseRing: { position: 'absolute', width: 50, height: 50, borderRadius: 16, borderWidth: 2, borderColor: 'rgba(34, 197, 94, 0.55)' },
    badge: { width: 46, height: 46, borderRadius: 15, backgroundColor: Colors.glassBg, borderWidth: 1.5, borderColor: Colors.glassBorder, justifyContent: 'center', alignItems: 'center' },
    badgeEmoji: { fontSize: 22 },
    statusDot: { position: 'absolute', right: 1, bottom: 1, width: 13, height: 13, borderRadius: 7, borderWidth: 2.5, borderColor: Colors.bgBody },
    greeting: { fontSize: 10.5, color: Colors.textMuted, fontFamily: FONTS.bodyRegular },
    name: { fontSize: 15, fontFamily: FONTS.titleBold, color: Colors.textMain, marginTop: 2 },
    location: { fontSize: 9.5, color: Colors.textMuted, fontFamily: FONTS.bodyRegular, marginTop: 1 },
    statusPill: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6 },
    pillOn: { backgroundColor: 'rgba(16, 185, 129, 0.12)', borderColor: 'rgba(16, 185, 129, 0.4)' },
    pillBreak: { backgroundColor: 'rgba(245, 158, 11, 0.12)', borderColor: 'rgba(245, 158, 11, 0.45)' },
    pillOff: { backgroundColor: Colors.subtleFill, borderColor: Colors.subtleBorder },
    pillDot: { width: 8, height: 8, borderRadius: 4 },
    pillText: { fontSize: 11, fontFamily: FONTS.bodySemiBold },
  })
);
