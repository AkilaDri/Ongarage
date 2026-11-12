import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Colors, FONTS, getThemeMode, themedStyles } from '@ongarage/shared';
import { formatTime } from '../utils/format';

const two = (n: number) => String(n).padStart(2, '0');
/** 01:23:05 for 1 h 23 min 5 s. */
const clock = (ms: number) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${two(Math.floor(s / 3600))}:${two(Math.floor((s % 3600) / 60))}:${two(s % 60)}`;
};

/**
 * The garage's own work timer: counts from the moment it started the work, and stops at the handover (`endedAt`). Only the garage sees it; the owner's app
 * shows nothing like it. It is a note for the garage (how long a job really takes), not part of the bill.
 */
export const WorkTimer: React.FC<{ startedAt: number; endedAt?: number; /** A small pill (the clock only) for the card's chip row. */ compact?: boolean }> = ({ startedAt, endedAt, compact }) => {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (endedAt) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [endedAt]);
  const ms = (endedAt ?? now) - startedAt;
  if (compact) {
    return (
      <View style={styles.timerChip} accessibilityLabel="Work timer">
        <Text style={styles.pillIcon}>⏱️</Text>
        <Text style={[styles.pillClock, !!endedAt && styles.clockDone]}>{clock(ms)}</Text>
      </View>
    );
  }
  return (
    <View style={styles.box} accessibilityLabel="Work timer">
      <Text style={styles.icon}>⏱️</Text>
      <View style={styles.flex1}>
        <Text style={styles.label}>{endedAt ? 'වැඩ කළ මුළු වෙලාව' : 'වැඩ කරමින් සිටී'} · ආරම්භය {formatTime(startedAt)}</Text>
      </View>
      <Text style={[styles.clock, !!endedAt && styles.clockDone]}>{clock(ms)}</Text>
    </View>
  );
};

const styles = themedStyles(() =>
  StyleSheet.create({
    flex1: { flex: 1 },
    box: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12, backgroundColor: getThemeMode() === 'dark' ? 'rgba(141, 177, 255, 0.12)' : '#e8f0fe' },
    timerChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, height: 28, borderRadius: 14, borderWidth: 1, borderColor: getThemeMode() === 'dark' ? 'rgba(141, 177, 255, 0.28)' : '#bfdbfe', backgroundColor: getThemeMode() === 'dark' ? 'rgba(141, 177, 255, 0.14)' : '#eff6ff' },
    pillIcon: { fontSize: 12 },
    pillClock: { fontSize: 12.5, fontFamily: FONTS.bodyBold, color: getThemeMode() === 'dark' ? '#8db1ff' : '#1a73e8', fontVariant: ['tabular-nums'] },
    icon: { fontSize: 16 },
    label: { fontSize: 12, fontFamily: FONTS.bodyMedium, color: Colors.textMuted },
    clock: { fontSize: 18, fontFamily: FONTS.titleBold, color: getThemeMode() === 'dark' ? '#8db1ff' : '#1a73e8', fontVariant: ['tabular-nums'] },
    clockDone: { color: Colors.successText },
  })
);
