import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Colors, getThemeMode, themedStyles } from '../theme/colors';
import { FONTS } from '../theme/fonts';

export type FilterTone = 'red' | 'blue' | 'amber' | 'green' | 'slate';
export type FilterItem<T extends string = string> = { id: T; label: string; tone?: FilterTone; icon?: React.ReactNode | ((on: boolean) => React.ReactNode); count?: number };

// Tinted chips: a pale background, a matching edge, a strong label and count (Tailwind rose / blue / amber / emerald / slate).
const TONES: Record<FilterTone, { bg: string; edge: string; text: string; count: string }> = {
  red: { bg: '#fff1f2', edge: '#fecdd3', text: '#e11d48', count: '#e11d48' },
  blue: { bg: '#eff6ff', edge: '#bfdbfe', text: '#1d4ed8', count: '#2563eb' },
  amber: { bg: '#fffbeb', edge: '#fde68a', text: '#92400e', count: '#d97706' },
  green: { bg: '#ecfdf5', edge: '#a7f3d0', text: '#047857', count: '#059669' },
  slate: { bg: '#f8fafc', edge: '#e2e8f0', text: '#475569', count: '#64748b' },
};

/**
 * The filter chips under the tabs of a page: tinted chips with the count on the chip's top edge. Touching the open one again clears it
 * (`onChange(null)`). The row slides sideways when it is longer than the screen.
 */
export function FilterChips<T extends string>({ items, value, onChange, plain, onBlue }: { items: FilterItem<T>[]; value: T | null; onChange: (id: T | null) => void; /** No chip background or edge (light theme): just the label. */ plain?: boolean; /** The chips sit on the blue header band: white labels, a yellow line under the open one. */ onBlue?: boolean }) {
  const dark = getThemeMode() === 'dark';
  // Plain (light theme): the chips share the bar's width equally, so the row is as wide as the tab bar above it and does not slide.
  const fit = !!plain && !dark;
  const Wrap: React.ComponentType<any> = fit ? View : ScrollView;
  const wrapProps = fit ? { style: styles.fitRow } : { horizontal: true, showsHorizontalScrollIndicator: false, contentContainerStyle: [styles.row, plain && styles.plainRow] };
  return (
    <Wrap {...wrapProps}>
      {items.map((c) => {
        const tone = TONES[c.tone ?? 'slate'];
        const on = value === c.id;
        return (
          <Pressable
            key={c.id}
            style={[styles.chip, { backgroundColor: dark ? Colors.bgCard : tone.bg, borderColor: dark ? Colors.borderColor : tone.edge }, plain && !dark && { backgroundColor: 'transparent', borderColor: 'transparent' }, !(plain && !dark) && on && styles.chipOn, !(plain && !dark) && on && { borderColor: tone.count }, plain && !dark && styles.plainChip, fit && styles.fitChip, fit && onBlue && styles.onBlueChip, fit && onBlue && on && styles.onBlueOn]}
            onPress={() => onChange(on ? null : c.id)}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            accessibilityLabel={c.label}
          >
            {typeof c.icon === 'function' ? c.icon(on) : c.icon}
            <Text style={[styles.text, { color: dark ? Colors.textMain : tone.text }, fit && onBlue && { color: on ? '#facc15' : '#ffffff' }]}>{c.label}</Text>
            {plain && !dark && on && !onBlue && <View pointerEvents="none" style={[styles.plainLine, { backgroundColor: tone.count }]} />}
            {!!c.count && c.count > 0 && (
              <View style={[styles.count, { backgroundColor: tone.count, borderColor: dark ? Colors.bgBody : '#ffffff' }]}>
                <Text style={styles.countText}>{c.count}</Text>
              </View>
            )}
          </Pressable>
        );
      })}
    </Wrap>
  );
}

const styles = themedStyles(() =>
  StyleSheet.create({
    // Room above the row for the counts that sit on the chips' top edge.
    row: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 10, paddingRight: 8 },
    chip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, height: 38, borderRadius: 12, borderWidth: 1 },
    // Plain chips: room on both sides so they do not touch the screen edges.
    fitRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingTop: 10, marginHorizontal: 6 },
    fitChip: { flex: 1, minWidth: 0, justifyContent: 'center', paddingHorizontal: 2, gap: 4 },
    // On the blue band: blue chips with a yellow edge; the open one is a deeper blue with a thicker edge.
    onBlueChip: { backgroundColor: '#2563eb', borderWidth: 1.5, borderColor: '#facc15', borderRadius: 20, height: 36 },
    onBlueOn: { backgroundColor: '#1d4ed8', borderWidth: 2.5 },
    plainRow: { paddingHorizontal: 14 },
    // Plain chips: no edge at all; the open one has a thick line under it.
    plainChip: { borderWidth: 0, paddingHorizontal: 8 },
    // A straight line along the chip's foot (a separate view, so no rounded corner can bend it).
    plainLine: { position: 'absolute', left: 8, right: 8, bottom: 0, height: 3, borderRadius: 0 },
    chipOn: { borderWidth: 2 },
    text: { fontSize: 12, fontFamily: FONTS.bodySemiBold },
    count: { position: 'absolute', top: -7, right: -3, minWidth: 16, height: 16, paddingHorizontal: 3, borderRadius: 6, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
    countText: { fontSize: 8.5, fontFamily: FONTS.bodyBold, color: '#ffffff' },
  })
);
