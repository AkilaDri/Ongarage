import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { pageHeaderBlue } from './PageHeader';
import { FONTS } from '../theme/fonts';
import { FilterChips, type FilterItem } from './FilterChips';
import { SegmentTabs, type SegmentItem } from './SegmentTabs';

/**
 * The top of a page in the garage app's Garage (Schedule) layout, made shared so every app can use it:
 * the navy band with the page title (and its icon) on the left and a right-hand icon, the tab pills under it,
 * and the chip row under the tabs. The band ends just under the chips.
 *
 * Values are the locked ones (see the top-bar-layout skill, section 7). Change them only with the user's word.
 */
export type TopBandLayoutProps<T extends string> = {
  /** The page title, e.g. "Garage" or "Activity". */
  title: string;
  /** A line icon in front of the title (white), e.g. the house for the Garage page. */
  icon?: React.ReactNode;
  /** The icon at the far right of the title row (e.g. the calendar). */
  right?: React.ReactNode;
  tabs: SegmentItem<T>[];
  tabValue: T;
  onTabChange: (id: T) => void;
  /** The chip row under the tabs (optional). */
  chips?: FilterItem[];
  chipValue?: string | null;
  onChipChange?: (id: string | null) => void;
  /** Space above the title. 46 by default (the status bar); an app that already has a safe-area inset above the band passes less. */
  paddingTop?: number;
  /** Extra space between the title row and the tab pills (0 by default, the locked garage layout). */
  navGap?: number;
  /** Corner radius of the tab bar (small = box-like). Default: the round pill of the garage layout. */
  navRadius?: number;
  /** Space under the chip row, inside the band (default 10, the locked garage layout). */
  navBottom?: number;
  /** How far the chip row rises under the tab pills (0 by default, the locked garage layout). */
  chipLift?: number;
  /** Corner radius of the chips under the tabs (default: the round chip of the garage layout). */
  chipRadius?: number;
  /** Height of the chips under the tabs (default: the shared height). */
  chipHeight?: number;
  /** Side space of the band (default 10) and of the title row inside it (default 6), the locked garage layout. */
  bandX?: number;
  titleX?: number;
};

export function TopBandLayout<T extends string>({ title, icon, right, tabs, tabValue, onTabChange, chips, chipValue = null, onChipChange, paddingTop = 46, navGap = 0, navRadius, navBottom = 10, chipLift = 0, chipRadius, chipHeight, bandX = 10, titleX = 6 }: TopBandLayoutProps<T>) {
  return (
    <View style={[styles.band, { paddingTop, paddingHorizontal: bandX, backgroundColor: pageHeaderBlue().from }]}>
      <View style={[styles.titleRow, { paddingHorizontal: titleX }]}>
        <View style={styles.titleLeft}>
          {icon}
          <Text style={styles.title} numberOfLines={1} accessibilityRole="header">{title}</Text>
        </View>
        {right}
      </View>
      <View style={[styles.navCard, { marginTop: navGap, marginBottom: navBottom }]}>
        <SegmentTabs pills items={tabs} value={tabValue} onChange={onTabChange} radius={navRadius} />
        {!!chips && chips.length > 0 && (
          <View style={{ marginTop: -chipLift }}>
            <FilterChips plain onBlue items={chips} value={chipValue} onChange={(id) => onChipChange?.(id)} radius={chipRadius} height={chipHeight} />
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  band: { paddingHorizontal: 10, paddingBottom: 6 },
  titleRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 6, gap: 8, paddingBottom: 14 },
  titleLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, minWidth: 0 },
  title: { flexShrink: 1, fontSize: 19, lineHeight: 24, fontFamily: FONTS.titleBold, color: '#ffffff' },
  navCard: { marginBottom: 10 },
});
