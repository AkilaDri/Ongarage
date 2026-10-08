import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Colors, FONTS, themedStyles, softFill, NAVY, getThemeMode } from '@ongarage/shared';
import { useParts } from '../context/PartsContext';
import { GarageMartView } from './GarageMartView';
import { GarageReferralsView } from './GarageReferralsView';
import { PartsScreen } from './PartsScreen';

/**
 * The garage's OnMart tab: the marketplace (shops around, search a part), "Job parts" (the parts the garage orders for
 * its booked jobs, as before) and the referrals it has sent to shops.
 */
type Segment = 'mart' | 'jobs' | 'referrals';

export const OnMartScreen: React.FC<{ focusId?: string | null; onFocusHandled?: () => void }> = ({ focusId, onFocusHandled }) => {
  const { awaitingChoice, referrals } = useParts();
  const [segment, setSegment] = useState<Segment>('mart');

  // Arriving from a booking card: open its parts request in Job parts.
  useEffect(() => {
    if (focusId) setSegment('jobs');
  }, [focusId]);

  const segments: { id: Segment; label: string; count: number }[] = [
    { id: 'mart', label: 'වෙළඳපොළ', count: 0 },
    { id: 'jobs', label: 'රැකියා කොටස්', count: awaitingChoice.length },
    { id: 'referrals', label: 'නිර්දේශ', count: referrals.filter((r) => r.status === 'purchased').length },
  ];

  return (
    <View style={styles.flex1}>
      <View style={styles.tabBar}>
        {segments.map((t) => {
          const active = segment === t.id;
          return (
            <Pressable key={t.id} style={[styles.tab, active && styles.tabActive]} onPress={() => setSegment(t.id)} accessibilityLabel={`OnMart ${t.id}`}>
              <Text style={[styles.tabText, active && styles.tabTextActive]} numberOfLines={1}>
                {t.label}
              </Text>
              {t.count > 0 && (
                <View style={[styles.count, active && styles.countActive]}>
                  <Text style={[styles.countText, active && { color: '#fff' }]}>{t.count}</Text>
                </View>
              )}
            </Pressable>
          );
        })}
      </View>
      {segment === 'mart' && <GarageMartView />}
      {segment === 'jobs' && <PartsScreen focusId={focusId} onFocusHandled={onFocusHandled} />}
      {segment === 'referrals' && <GarageReferralsView />}
    </View>
  );
};

const styles = themedStyles(() =>
  StyleSheet.create({
    flex1: { flex: 1 },
    tabBar: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4, zIndex: 6, backgroundColor: getThemeMode() === 'dark' ? Colors.bgBody : '#ffffff' },
    tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, paddingHorizontal: 8, borderRadius: 22, backgroundColor: softFill() },
    tabActive: { backgroundColor: NAVY, shadowColor: NAVY, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.28, shadowRadius: 8, elevation: 4 },
    tabText: { fontSize: 11.5, fontFamily: FONTS.bodySemiBold, color: Colors.textMuted },
    tabTextActive: { color: '#ffffff' },
    count: { position: 'absolute', top: -7, right: -4, minWidth: 19, height: 19, paddingHorizontal: 5, borderRadius: 10, borderWidth: 2, borderColor: getThemeMode() === 'dark' ? Colors.bgBody : '#ffffff', backgroundColor: '#ef4444', alignItems: 'center', justifyContent: 'center' },
    countActive: { backgroundColor: '#4ca1d1' },
    countText: { fontSize: 9.5, fontWeight: '800', color: '#fff' },
  })
);
