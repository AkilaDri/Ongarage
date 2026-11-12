import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Colors, getThemeMode, themedStyles } from '../theme/colors';
import { FONTS } from '../theme/fonts';
import { Icon, type IconName } from './Icons';

export type SegmentItem<T extends string = string> = { id: T; label: string; icon?: IconName; count?: number; /** The count needs action: it is red. */ alert?: boolean };

/**
 * The tabs under a page header, one track: the open tab is a light blue segment with a blue label and its count in a small blue chip, the others
 * are plain slate. The same in every app.
 */
export function SegmentTabs<T extends string>({ items, value, onChange }: { items: SegmentItem<T>[]; value: T; onChange: (id: T) => void }) {
  return (
    <View style={styles.track}>
      {items.map((t) => {
        const on = t.id === value;
        return (
          <Pressable key={t.id} style={[styles.chip, on && styles.chipOn]} onPress={() => onChange(t.id)} accessibilityRole="tab" accessibilityState={{ selected: on }} accessibilityLabel={t.label}>
            {!!t.icon && <Icon name={t.icon} size={14} color={on ? (getThemeMode() === 'dark' ? '#8db1ff' : '#2563eb') : '#94a3b8'} />}
            <Text style={[styles.text, on && styles.textOn]} numberOfLines={1}>
              {t.label}
            </Text>
            {!!t.count && t.count > 0 && (
              <View style={[styles.count, t.alert && styles.countAlert]}>
                <Text style={[styles.countText, t.alert && styles.countTextAlert]}>{t.count}</Text>
              </View>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = themedStyles(() =>
  StyleSheet.create({
    // A flat bar like PickMe's: equal tabs straight on the page (no background) with a hairline under them; the open tab has a bold dark label and a thick blue line under it.
    track: { flexDirection: 'row', backgroundColor: 'transparent', borderBottomWidth: 1, borderBottomColor: getThemeMode() === 'dark' ? Colors.borderColor : '#e5e7eb' },
    chip: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, height: 46, paddingHorizontal: 8, borderBottomWidth: 3, borderBottomColor: 'transparent' },
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
