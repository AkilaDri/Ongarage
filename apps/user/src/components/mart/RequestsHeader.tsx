import React from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { FONTS, pageHeaderBlue, SegmentTabs, themedStyles, type RequestTab } from '@ongarage/shared';
import { VehicleChip } from '../VehicleChip';

const TABS: { id: RequestTab; label: string }[] = [
  { id: 'received', label: 'Received' },
  { id: 'pending', label: 'Pending' },
  { id: 'expired', label: 'Expired' },
];

/**
 * The Requests header, measured as the Bids one: a blue band with the title row (and the vehicle) over the tab pills. As the list scrolls
 * (`fold` 0 to 1) the title row folds away and the tabs stay pinned.
 */
export const RequestsHeader: React.FC<{
  fold: Animated.Value;
  /** The title row's measured height (0 until measured). */
  titleH: number;
  onTitleHeight: (h: number) => void;
  tab: RequestTab;
  counts: Record<RequestTab, number>;
  onTabChange: (tab: RequestTab) => void;
  /** The sort chips under the tabs, which stay pinned with them. */
  children?: React.ReactNode;
}> = ({ fold, titleH, onTitleHeight, tab, counts, onTabChange, children }) => (
  <Animated.View style={[styles.band, { paddingTop: fold.interpolate({ inputRange: [0, 1], outputRange: [46, 12] }) }]}>
    <Animated.View style={{ overflow: 'hidden', opacity: fold.interpolate({ inputRange: [0, 0.6], outputRange: [1, 0], extrapolate: 'clamp' }), height: titleH ? fold.interpolate({ inputRange: [0, 1], outputRange: [titleH, 0] }) : undefined }}>
      <View style={styles.titleRow} onLayout={(e) => onTitleHeight(Math.round(e.nativeEvent.layout.height))}>
        <Text style={styles.title} numberOfLines={1} accessibilityRole="header">
          OnMart Requests
        </Text>
        <VehicleChip onBlue />
      </View>
    </Animated.View>
    <View style={styles.nav}>
      <SegmentTabs pills radius={12} items={TABS.map((t) => ({ ...t, count: counts[t.id] }))} value={tab} onChange={onTabChange} />
      {children}
    </View>
  </Animated.View>
);

const styles = themedStyles(() =>
  StyleSheet.create({
    band: { paddingHorizontal: 10, paddingBottom: 6, backgroundColor: pageHeaderBlue().from },
    titleRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 6, gap: 8, paddingBottom: 14, minHeight: 44 },
    title: { flex: 1, fontSize: 19, lineHeight: 24, fontFamily: FONTS.titleBold, color: '#ffffff' },
    nav: { marginBottom: 10 },
  })
);
