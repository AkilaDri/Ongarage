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
  return (
    <View style={styles.row} accessibilityRole="tablist">
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
  );
};

const dark = () => getThemeMode() === 'dark';

const styles = themedStyles(() =>
  StyleSheet.create({
    row: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 4 },
    tab: { flex: 1, alignItems: 'center', gap: 5 },
    circle: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: dark() ? 'rgba(255, 255, 255, 0.08)' : '#eaeff6' },
    circleOn: { backgroundColor: '#1a73e8' },
    circleDone: { backgroundColor: '#16a34a' },
    circleText: { fontSize: 12.5, fontFamily: FONTS.bodyBold, color: Colors.textMuted },
    circleTextOn: { color: '#ffffff' },
    label: { fontSize: 10.5, fontFamily: FONTS.bodySemiBold, color: Colors.textMuted, textAlign: 'center' },
    labelOn: { color: dark() ? '#8db1ff' : '#1a73e8', fontFamily: FONTS.bodyBold },
  })
);
