import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Colors, FONTS, getThemeMode, themedStyles } from '@ongarage/shared';

export type FormTab = { id: string; label: string; /** The part of the form is filled in (it shows a tick once the owner has moved past it). */ done: boolean };

/**
 * The steps of a long form as tabs along its top (the booking form, the repair-job form): a numbered circle and a short name each, the open one in blue, the
 * ones already filled in ticked. Any tab can be touched to jump to it, and the form's button moves on to the next one in order.
 */
export const FormTabs: React.FC<{ tabs: FormTab[]; active: string; onChange: (id: string) => void }> = ({ tabs, active, onChange }) => {
  const at = tabs.findIndex((t) => t.id === active);
  const n = tabs.length;
  // The track runs from the centre of the first circle to the centre of the last one; the filled part reaches the open step, like the SOS stepper.
  const half = 100 / n / 2;
  const fill = n > 1 ? (Math.max(0, at) / (n - 1)) * 100 : 0;
  return (
    <View accessibilityRole="tablist" accessibilityLabel={`Step ${at + 1} of ${n}: ${tabs[at]?.label ?? ''}`}>
      <View style={[styles.track, { left: `${half}%`, right: `${half}%` }]}>
        <View style={[styles.trackFill, { width: `${fill}%` }]} />
      </View>
      <View style={styles.row}>
        {tabs.map((t, i) => {
          const on = t.id === active;
          const ticked = !on && t.done && i < at;
          return (
            <Pressable key={t.id} style={styles.tab} onPress={() => onChange(t.id)} accessibilityRole="tab" accessibilityLabel={`Step ${i + 1} ${t.label}`} accessibilityState={{ selected: on }}>
              <View style={[styles.circle, on && styles.circleOn, ticked && styles.circleDone]}>
                <Text style={[styles.circleText, (on || ticked) && styles.circleTextOn]}>{ticked ? '✓' : i + 1}</Text>
              </View>
              <Text style={[styles.label, on && styles.labelOn]} numberOfLines={1}>
                {t.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
};

const dark = () => getThemeMode() === 'dark';

const styles = themedStyles(() =>
  StyleSheet.create({
    row: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 4 },
    // The line behind the circles: grey track, blue up to the open step (the circles are 28px, so the line is centred on them).
    track: { position: 'absolute', top: 16.5, height: 3, borderRadius: 2, backgroundColor: dark() ? 'rgba(255, 255, 255, 0.1)' : '#d6dde8' },
    trackFill: { height: 3, borderRadius: 2, backgroundColor: '#2563eb' },
    tab: { flex: 1, alignItems: 'center', gap: 5, minHeight: 44, justifyContent: 'flex-start' },
    circle: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: dark() ? 'rgba(255, 255, 255, 0.08)' : '#eaeff6' },
    circleOn: { backgroundColor: '#2563eb' },
    circleDone: { backgroundColor: '#15803d' },
    circleText: { fontSize: 13, fontFamily: FONTS.bodyBold, color: dark() ? Colors.textMuted : '#475569' },
    circleTextOn: { color: '#ffffff' },
    label: { fontSize: 12, fontFamily: FONTS.bodySemiBold, color: dark() ? Colors.textMuted : '#475569', textAlign: 'center' },
    labelOn: { color: dark() ? '#8db1ff' : '#2563eb', fontFamily: FONTS.bodyBold },
  })
);
