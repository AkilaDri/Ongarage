import { HEADER_SCROLL } from '../utils/collapsingHeader';
import { elevation1, outline } from '../utils/material';
import { pageBg } from '../utils/pageBg';
import React, { useEffect } from 'react';
import { chatDockOffset } from '../utils/chatDock';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { Colors, FONTS, getThemeMode, themedStyles } from '@ongarage/shared';
import { useParts } from '../context/PartsContext';
import { MartScreen, type MartSegment } from './MartScreen';
import { useVehicles } from '../context/VehiclesContext';
import { GarageReferralsView } from './GarageReferralsView';
import { PartsScreen } from './PartsScreen';
import { OrdersIcon, RequestsIcon, ShopsIcon } from '../components/MartNavIcon';

/**
 * The garage's OnMart tab: the marketplace (shops, my requests, the open wall, my orders — the owner app's OnMart), "Job parts"
 * (the parts the garage orders for its booked jobs) and the referrals it has sent to shops. The marketplace's sections are
 * on OnMart's own bottom bar (App.tsx), which replaces the main one while this tab is open.
 */
export type OnMartTop = 'mart' | 'jobs' | 'referrals';

/** The top tab bar's height (48 + 8 above; the 8 below belong to the search bar's padding). */
const TOP_BAR_H = 56;

export const OnMartScreen: React.FC<{
  top: OnMartTop;
  onTopChange: (top: OnMartTop) => void;
  section: MartSegment;
  onSectionChange: (section: MartSegment) => void;
  focusId?: string | null;
  /** A part to search in the marketplace (from a chat). */
  searchSeed?: string;
  /** A shop to open in the marketplace (from a chat). */
  shopRequest?: { id: string; at: number; ask?: boolean } | null;
  onFocusHandled?: () => void;
  /** How far the headers have scrolled away (0 = showing … ONMART_BAR_H = gone); shared with App, which moves the title band by it. */
  shift: Animated.Value;
  onScrollY: (y: number) => void;
  setBarShown: (visible: boolean) => void;
  reset: () => void;
  /** The title band's height: the block it belongs to reaches this far past the bottom. */
  bandHeight: number;
}> = ({ top, onTopChange, section, onSectionChange, searchSeed, shopRequest, focusId, onFocusHandled, shift, onScrollY, setBarShown, reset, bandHeight }) => {
  const { awaitingChoice, referrals } = useParts();
  const { vehicles } = useVehicles();
  // The headers' shift is App's (the title band moves by it too); another part of OnMart always opens with them showing.
  useEffect(() => {
    reset();
    setBarShown(true);
  }, [top, section, reset, setBarShown]);

  // Each part has its icon (the same two-tone icons as OnMart's bottom bar): the shop front, the parts box, the sent recommendations.
  const tops: { id: OnMartTop; label: string; count: number; icon: React.FC<{ active: boolean; size?: number }> }[] = [
    { id: 'mart', label: 'වෙළඳපොළ', count: 0, icon: ShopsIcon },
    { id: 'jobs', label: 'රැකියා කොටස්', count: awaitingChoice.length, icon: OrdersIcon },
    { id: 'referrals', label: 'නිර්දේශ', count: referrals.filter((r) => r.status === 'purchased').length, icon: RequestsIcon },
  ];

  // Both layers move up by the same distance. The list layer is taller than the room it has by the tab bar's height, so
  // when the bar has moved away the list fills the whole room; nothing is re-laid out while it scrolls.
  // The tab bar stays pinned under the folded header; the chat icon sits under it (and under the Mart page's own pinned bar).
  useEffect(() => {
    if (top !== 'mart') chatDockOffset.setValue(TOP_BAR_H);
  }, [top]);

  return (
    <View style={styles.flex1}>
      <Animated.View style={styles.barLayer}>
        <View style={styles.track}>
          {tops.map((t) => {
            const active = top === t.id;
            return (
              <Pressable key={t.id} style={styles.tab} onPress={() => onTopChange(t.id)} accessibilityLabel={`OnMart ${t.id}`}>
                <t.icon active={active} size={22} />
                <Text style={[styles.tabText, active && styles.tabTextActive]} numberOfLines={1}>
                  {t.label}
                </Text>
                {t.count > 0 && (
                  <View style={styles.count}>
                    <Text style={styles.countText}>{t.count}</Text>
                  </View>
                )}
                {active && <View style={styles.indicator} />}
              </Pressable>
            );
          })}
        </View>
      </Animated.View>
      <Animated.View style={styles.listLayer}>
        {top === 'mart' && <MartScreen activeVehicle={vehicles[0]?.id ?? 'none'} segment={section} onSegmentChange={onSectionChange} onHeaderVisibilityChange={setBarShown} onScrollY={onScrollY} bottomInset={bandHeight} searchSeed={searchSeed} openShopRequest={shopRequest} />}
        {top === 'jobs' && <PartsScreen focusId={focusId} onFocusHandled={onFocusHandled} onScrollY={onScrollY} />}
        {top === 'referrals' && <GarageReferralsView onScrollY={onScrollY} />}
      </Animated.View>
    </View>
  );
};

const styles = themedStyles(() =>
  StyleSheet.create({
    flex1: { flex: 1 },
    // The selected tab is marked by a line under it, like Material primary tabs.
    indicator: { position: 'absolute', left: 14, right: 14, bottom: 0, height: 3, borderTopLeftRadius: 3, borderTopRightRadius: 3, backgroundColor: Colors.primary },
    // The tab bar sits on top of the list layer, which starts under it and reaches one bar-height past the bottom.
    barLayer: { position: 'absolute', top: 0, left: 0, right: 0, height: TOP_BAR_H, paddingHorizontal: 6, paddingTop: 8, paddingBottom: 0, zIndex: 6, backgroundColor: pageBg() },
    listLayer: { position: 'absolute', top: TOP_BAR_H, left: 0, right: 0, bottom: 0 },
    track: { flexDirection: 'row', borderRadius: 12, backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: outline(), ...elevation1() },
    tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 48, paddingHorizontal: 6 },
    tabText: { fontSize: 12.5, fontFamily: FONTS.bodySemiBold, color: Colors.textMuted, flexShrink: 1 },
    tabTextActive: { color: Colors.primary },
    count: { minWidth: 20, height: 20, paddingHorizontal: 6, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: getThemeMode() === 'dark' ? 'rgba(141, 177, 255, 0.24)' : '#d2e3fc' },
    countText: { fontSize: 10.5, fontFamily: FONTS.bodyBold, color: getThemeMode() === 'dark' ? '#8db1ff' : '#1a73e8' },
  })
);
