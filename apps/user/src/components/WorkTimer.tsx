import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { FONTS, getThemeMode, themedStyles } from '@ongarage/shared';

const two = (n: number) => String(n).padStart(2, '0');
/** 01:23:05 for 1 h 23 min 5 s. */
const clock = (ms: number) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${two(Math.floor(s / 3600))}:${two(Math.floor((s % 3600) / 60))}:${two(s % 60)}`;
};

/** How long the garage has been working on the job: a small clock pill that runs from the start of the work and stops at the handover. */
export const WorkTimer: React.FC<{ startedAt: number; endedAt?: number }> = ({ startedAt, endedAt }) => {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (endedAt) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [endedAt]);
  return (
    <View style={styles.timerChip} accessibilityLabel="Work timer">
      <Text style={styles.icon}>⏱️</Text>
      <Text style={styles.clock}>{clock((endedAt ?? now) - startedAt)}</Text>
    </View>
  );
};

const styles = themedStyles(() =>
  StyleSheet.create({
    timerChip: { alignSelf: 'flex-end', flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, height: 28, borderRadius: 14, borderWidth: 1, borderColor: getThemeMode() === 'dark' ? 'rgba(141, 177, 255, 0.28)' : '#bfdbfe', backgroundColor: getThemeMode() === 'dark' ? 'rgba(141, 177, 255, 0.14)' : '#eff6ff' },
    icon: { fontSize: 12 },
    clock: { fontSize: 12.5, fontFamily: FONTS.bodyBold, color: getThemeMode() === 'dark' ? '#8db1ff' : '#2563eb', fontVariant: ['tabular-nums'] },
  })
);
