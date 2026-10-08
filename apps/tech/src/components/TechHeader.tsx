import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Colors, FONTS, Pulse, themedStyles, softShadow, headerBand, getThemeMode } from '@ongarage/shared';
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
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 18, paddingTop: 12, paddingBottom: 30, backgroundColor: headerBand().bg },
    brandBox: { flexDirection: 'row', alignItems: 'center', gap: 12, flexShrink: 1, marginRight: 8 },
    flexShrink: { flexShrink: 1 },
    badgeWrap: { width: 52, height: 52, justifyContent: 'center', alignItems: 'center' },
    pulseRing: { position: 'absolute', width: 52, height: 52, borderRadius: 26, borderWidth: 2, borderColor: 'rgba(34, 197, 94, 0.55)' },
    badge: { width: 46, height: 46, borderRadius: 23, backgroundColor: '#ffffff', justifyContent: 'center', alignItems: 'center', ...softShadow() },
    badgeEmoji: { fontSize: 22 },
    statusDot: { position: 'absolute', right: 1, bottom: 1, width: 13, height: 13, borderRadius: 7, borderWidth: 2.5, borderColor: headerBand().bg },
    greeting: { fontSize: 11.5, color: headerBand().sub, fontFamily: FONTS.bodyMedium },
    name: { fontSize: 16, fontFamily: FONTS.titleBold, color: headerBand().title, marginTop: 1 },
    location: { fontSize: 10, color: headerBand().sub, fontFamily: FONTS.bodyRegular, marginTop: 1 },
    statusPill: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 7, backgroundColor: getThemeMode() === 'dark' ? headerBand().pill : '#ffffff', ...softShadow() },
    pillOn: {},
    pillBreak: {},
    pillOff: {},
    pillDot: { width: 8, height: 8, borderRadius: 4 },
    pillText: { fontSize: 11, fontFamily: FONTS.bodySemiBold },
  })
);
