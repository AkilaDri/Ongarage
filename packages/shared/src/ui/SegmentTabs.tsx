import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Colors, getThemeMode, themedStyles } from '../theme/colors';
import { FONTS } from '../theme/fonts';
import { Icon, type IconName } from './Icons';

export type SegmentItem<T extends string = string> = { id: T; label: string; icon?: IconName; count?: number; /** The count needs action: it is red. */ alert?: boolean };

/**
 * The tabs under a page header, one track: the open tab is a light blue segment with a blue label and its count in a small blue chip, the others
 * are plain slate. The same in every app.
 */
export function SegmentTabs<T extends string>({ items, value, onChange, pills }: { items: SegmentItem<T>[]; value: T; onChange: (id: T) => void; /** A white bar with round chips; the open one is filled blue. */ pills?: boolean }) {
  const body = (
    <>
      {items.map((t) => {
        const on = t.id === value;
        return (
          <Pressable key={t.id} style={[styles.chip, on && styles.chipOn, pills && styles.pillChip, pills && !!t.count && t.count > 0 && styles.pillChipCount, pills && on && styles.pillChipOn]} onPress={() => onChange(t.id)} accessibilityRole="tab" accessibilityState={{ selected: on }} accessibilityLabel={t.label}>
            {!!t.icon && <Icon name={t.icon} size={14} color={pills && on ? '#ffffff' : on ? (getThemeMode() === 'dark' ? '#8db1ff' : '#2563eb') : '#94a3b8'} />}
            <Text style={[styles.text, on && styles.textOn, pills && styles.pillText, pills && on && styles.pillTextOn]} numberOfLines={1}>
              {t.label}
            </Text>
            {!!t.count && t.count > 0 && (
              <View style={[styles.count, pills && styles.pillCount, t.alert && styles.countAlert]}>
                <Text style={[styles.countText, pills && !t.alert && styles.pillCountText, t.alert && styles.countTextAlert]}>{t.count}</Text>
              </View>
            )}
          </Pressable>
        );
      })}
    </>
  );
  // The pill bar slides sideways when its tabs are wider than the screen.
  if (pills) {
    return (
      <View style={styles.pillTrack}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillRow}>
          {body}
        </ScrollView>
      </View>
    );
  }
  return <View style={styles.track}>{body}</View>;
}

const styles = themedStyles(() =>
  StyleSheet.create({
    // A flat bar like PickMe's: equal tabs straight on the page (no background) with a hairline under them; the open tab has a bold dark label and a thick blue line under it.
    track: { flexDirection: 'row', backgroundColor: 'transparent', borderBottomWidth: 1, borderBottomColor: getThemeMode() === 'dark' ? Colors.borderColor : '#e5e7eb' },
    chip: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, height: 46, paddingHorizontal: 8, borderBottomWidth: 3, borderBottomColor: 'transparent' },
    pillTrack: { marginBottom: 10, marginHorizontal: 6, backgroundColor: getThemeMode() === 'dark' ? Colors.bgCard : '#ffffff', borderRadius: 26, padding: 4, shadowColor: '#2563eb', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.26, shadowRadius: 20, elevation: 8 },
    pillRow: { gap: 4, flexGrow: 1 },
    pillCount: { top: 1, right: 5, minWidth: 15, height: 15, borderWidth: 0, backgroundColor: '#facc15' },
    pillChipCount: { paddingRight: 22 },
    pillCountText: { color: '#111827' },
    pillChip: { flexGrow: 1, flexShrink: 0, minWidth: 96, height: 40, borderRadius: 22, borderBottomWidth: 0 },
    pillChipOn: { backgroundColor: '#2563eb', borderBottomColor: 'transparent' },
    pillText: { fontSize: 14 },
    pillTextOn: { color: '#ffffff' },
    chipOn: { borderBottomColor: '#2563eb' },
    text: { flexShrink: 1, fontSize: 12, fontFamily: FONTS.bodyMedium, color: getThemeMode() === 'dark' ? Colors.textMuted : '#6b7280' },
    textOn: { fontFamily: FONTS.bodyBold, color: getThemeMode() === 'dark' ? Colors.textMain : '#111827' },
    // The count sits on the tab's top edge (right side), above it, with a white ring.
    count: { position: 'absolute', top: -7, right: 6, minWidth: 16, height: 16, paddingHorizontal: 3, borderRadius: 6, borderWidth: 1.5, borderColor: getThemeMode() === 'dark' ? Colors.bgCard : '#ffffff', alignItems: 'center', justifyContent: 'center', backgroundColor: '#2563eb' },
    countText: { fontSize: 8.5, fontFamily: FONTS.bodyBold, color: '#ffffff' },
    countAlert: { backgroundColor: '#f43f5e' },
    countTextAlert: { color: '#ffffff' },
  })
);
