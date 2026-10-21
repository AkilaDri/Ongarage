import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { getThemeMode, themedStyles } from '../theme/colors';
import { FONTS } from '../theme/fonts';
import { headerBand } from './Glass';

type TitleTab = { id: string; label: string; icon?: React.ReactNode; active: boolean; onPress: () => void };

const TAB_GAP = 14;

/**
 * Several titles side by side. The open one always stands first, in full colour; the others follow, faded. Touching a faded one opens it:
 * it slides into the first place while the one that was there slides to the next (each title is moved by the difference between where
 * it stands and where it should stand, so nothing is laid out again).
 */
const TitleTabs: React.FC<{ tabs: TitleTab[] }> = ({ tabs }) => {
  const [widths, setWidths] = useState<Record<string, number>>({});
  const shift = useRef<Record<string, Animated.Value>>({});
  const sorted = [...tabs].sort((a, b) => Number(b.active) - Number(a.active));
  const key = sorted.map((t) => t.id).join('|');

  const xIn = (list: TitleTab[], id: string) => {
    let x = 0;
    for (const t of list) {
      if (t.id === id) return x;
      x += (widths[t.id] ?? 0) + TAB_GAP;
    }
    return x;
  };

  useEffect(() => {
    for (const t of tabs) {
      if (!shift.current[t.id]) shift.current[t.id] = new Animated.Value(0);
      const to = xIn(sorted, t.id) - xIn(tabs, t.id);
      Animated.timing(shift.current[t.id], { toValue: to, duration: 240, easing: Easing.out(Easing.cubic), useNativeDriver: Platform.OS !== 'web' }).start();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, widths]);

  return (
    <View style={styles.tabsRow}>
      {tabs.map((t) => {
        if (!shift.current[t.id]) shift.current[t.id] = new Animated.Value(0);
        return (
          <Animated.View
            key={t.id}
            style={{ transform: [{ translateX: shift.current[t.id] }], opacity: t.active ? 1 : 0.38 }}
            onLayout={(e) => {
              const w = Math.round(e.nativeEvent.layout.width);
              setWidths((prev) => (prev[t.id] === w ? prev : { ...prev, [t.id]: w }));
            }}
          >
            <Pressable style={styles.tab} onPress={t.onPress} hitSlop={8} accessibilityRole="tab" accessibilityState={{ selected: t.active }} accessibilityLabel={t.label}>
              {t.icon}
              <Text style={styles.text} accessibilityRole="header">
                {t.label}
              </Text>
            </Pressable>
          </Animated.View>
        );
      })}
    </View>
  );
};

// The owner app's tab title band: replaces the greeting header on Jobs, Schedule and Parts.
export const TitleBand: React.FC<{
  title: string;
  icon?: React.ReactNode;
  backgroundColor?: string;
  /** Further titles side by side with the first (a page and its activity): the open one is in full colour, the others faded, and tapping one opens it. */
  tabs?: TitleTab[];
  /** A button at the right end of the band (a calendar, say), clear of the floating chat button. */
  right?: React.ReactNode;
}> = ({ title, icon, backgroundColor, tabs, right }) => (
  <View style={[styles.band, (!!icon || !!tabs) && styles.bandIcon, !!backgroundColor && { backgroundColor }]}>
    {icon}
    {tabs ? (
      <TitleTabs tabs={tabs} />
    ) : (
      <Text style={styles.text} accessibilityRole="header">
        {title}
      </Text>
    )}
    {!!right && <View style={styles.right}>{right}</View>}
  </View>
);

const styles = themedStyles(() =>
  StyleSheet.create({
    band: { paddingHorizontal: 18, paddingTop: 14, paddingBottom: 34, backgroundColor: headerBand().bg },
    // With an icon: icon and title in a row, clear of the floating chat button on the right.
    bandIcon: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingTop: 15, paddingBottom: 15, minHeight: 58, paddingRight: 90 },
    right: { marginLeft: 'auto' },
    tabsRow: { flexDirection: 'row', alignItems: 'center', gap: TAB_GAP },
    // A title with its icon in front of it.
    tab: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    text: { fontSize: 20, fontFamily: FONTS.titleBold, color: getThemeMode() === 'dark' ? '#d6eefc' : '#0f2a3d' },
  })
);
