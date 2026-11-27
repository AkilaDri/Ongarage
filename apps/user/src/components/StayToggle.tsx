import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Colors, FONTS, getThemeMode, themedStyles } from '@ongarage/shared';

export type StayOption = { stays: boolean; label: string; /** What choosing it means, shown under the toggle. */ about: string; a11y: string };

/**
 * Stay with the vehicle or leave it: one two-way toggle, used by the booking step and the running job card. Both answers are always named, and a line under
 * it says what the chosen one means. `value` is null until the owner answers (the app does not answer for them); `empty` is the line shown until then.
 */
export const StayToggle: React.FC<{ value: boolean | null; options: StayOption[]; onChange: (stays: boolean) => void; empty?: string }> = ({ value, options, onChange, empty }) => {
  const lines = [...options.map((o) => ({ key: o.a11y, text: o.about, on: value === o.stays })), ...(empty ? [{ key: 'empty', text: empty, on: value === null }] : [])];
  return (
    <View style={styles.wrap}>
      <View style={styles.track} accessibilityRole="radiogroup">
        {options.map((o) => {
          const on = value === o.stays;
          return (
            <Pressable key={o.a11y} style={[styles.pill, on && styles.pillOn]} onPress={() => !on && onChange(o.stays)} accessibilityRole="radio" accessibilityState={{ selected: on }} accessibilityLabel={o.a11y}>
              <Text style={[styles.text, on && styles.textOn]} numberOfLines={2}>
                {o.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {/* The lines lie in one place and only the current one shows, so the space is always the longest one's height and nothing below moves. */}
      <View style={styles.hintStack}>
        {lines.map((l, i) => (
          <Text key={l.key} style={[styles.hint, i > 0 && styles.hintOver, !l.on && styles.hintHidden]} accessibilityElementsHidden={!l.on} importantForAccessibility={l.on ? 'auto' : 'no-hide-descendants'} aria-hidden={!l.on}>
            {l.text}
          </Text>
        ))}
      </View>
    </View>
  );
};

const styles = themedStyles(() =>
  StyleSheet.create({
    wrap: { gap: 6 },
    track: { flexDirection: 'row', gap: 4, padding: 3, borderRadius: 26, borderWidth: 1, borderColor: getThemeMode() === 'dark' ? Colors.borderColor : '#dbe3ef', backgroundColor: Colors.bgCard },
    // Both halves are the same width and weight, so nothing shifts when the choice moves.
    pill: { flex: 1, minHeight: 44, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8, borderRadius: 22, borderWidth: 1.5, borderColor: 'transparent' },
    pillOn: { backgroundColor: '#1e3a8a', borderColor: '#facc15' },
    text: { fontSize: 13.5, lineHeight: 20, fontFamily: FONTS.bodySemiBold, color: Colors.textMuted, textAlign: 'center' },
    textOn: { color: '#ffffff' },
    hintStack: { flexDirection: 'row', alignItems: 'flex-start' },
    hint: { width: '100%', flexShrink: 0, fontSize: 13, lineHeight: 20, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, textAlign: 'center' },
    hintOver: { marginLeft: '-100%' },
    hintHidden: { opacity: 0 },
  })
);
