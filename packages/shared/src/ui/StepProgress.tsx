import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Colors, themedStyles } from '../theme/colors';
import { FONTS } from '../theme/fonts';

/**
 * A segmented progress bar with the current step's name, matching the SOS dispatch
 * steppers. `current` is the index of the active step; `alert` paints it amber (e.g.
 * waiting for the owner, or a dispute).
 */
export const StepProgress: React.FC<{ steps: string[]; current: number; alert?: boolean; compact?: boolean }> = ({ steps, current, alert, compact }) => {
  const i = Math.max(0, Math.min(current, steps.length - 1));
  return (
    <View style={styles.wrap}>
      <View style={styles.bar}>
        {steps.map((s, j) => (
          <View key={s} style={[styles.seg, j < i && styles.done, j === i && (alert ? styles.alert : styles.active)]} />
        ))}
      </View>
      {!compact && (
        <Text style={styles.label}>
          පියවර {i + 1}/{steps.length} · <Text style={[styles.labelStrong, alert && { color: Colors.warning }]}>{steps[i]}</Text>
        </Text>
      )}
    </View>
  );
};

const styles = themedStyles(() =>
  StyleSheet.create({
    wrap: { gap: 6 },
    bar: { flexDirection: 'row', gap: 4 },
    seg: { flex: 1, height: 4, borderRadius: 2, backgroundColor: Colors.subtleBorder },
    done: { backgroundColor: Colors.success },
    active: { backgroundColor: Colors.primary },
    alert: { backgroundColor: Colors.warning },
    label: { fontSize: 10.5, fontFamily: FONTS.bodyMedium, color: Colors.textMuted },
    labelStrong: { fontFamily: FONTS.bodyBold, color: Colors.textMain },
  })
);
