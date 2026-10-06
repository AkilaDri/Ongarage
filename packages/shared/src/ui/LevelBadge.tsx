import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Colors, themedStyles } from '../theme/colors';
import { FONTS } from '../theme/fonts';
import { LEVELS } from '../marketplace/levels';
import type { LevelId } from '../types';

// Each rung has its own tint so owners can tell them apart at a glance.
const TINT: Record<LevelId, { bg: string; border: string; text: () => string }> = {
  registered: { bg: 'rgba(148, 163, 184, 0.12)', border: 'rgba(148, 163, 184, 0.35)', text: () => Colors.textMuted },
  verified: { bg: 'rgba(16, 185, 129, 0.12)', border: 'rgba(16, 185, 129, 0.4)', text: () => Colors.successText },
  trusted: { bg: 'rgba(56, 189, 248, 0.12)', border: 'rgba(56, 189, 248, 0.45)', text: () => Colors.primary },
  premier: { bg: 'rgba(245, 158, 11, 0.14)', border: 'rgba(245, 158, 11, 0.5)', text: () => Colors.warning },
};

/** A garage's level on the trust ladder, as owners see it next to its name. */
export const LevelBadge: React.FC<{ level: LevelId; compact?: boolean }> = ({ level, compact }) => {
  const l = LEVELS.find((x) => x.id === level) ?? LEVELS[0];
  const t = TINT[l.id];
  return (
    <View style={[styles.badge, { backgroundColor: t.bg, borderColor: t.border }]} accessibilityLabel={`Level ${l.id}`}>
      <Text style={[styles.text, compact && styles.compact, { color: t.text() }]}>
        {l.icon} {l.name}
      </Text>
    </View>
  );
};

const styles = themedStyles(() =>
  StyleSheet.create({
    badge: { alignSelf: 'flex-start', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 8, borderWidth: 1 },
    text: { fontSize: 10.5, fontFamily: FONTS.bodyBold },
    compact: { fontSize: 9.5 },
  })
);
