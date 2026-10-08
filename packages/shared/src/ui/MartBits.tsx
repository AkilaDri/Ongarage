import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Colors, themedStyles } from '../theme/colors';
import { FONTS } from '../theme/fonts';
import { PRICE_TAG_LABEL, SORT_LABELS, type Fitment, type MartSort, type PriceTag } from '../marketplace/partsMart';
import { softEdge, softFill } from './Glass';

// Small pieces OnMart screens in the owner, garage and parts apps share.

const FITMENT_TEXT: Record<Fitment, string> = { confirmed: '✓ ඔබගේ වාහනයට ගැළපෙන බව වෙළඳසැල තහවුරු කළා', likely: 'ගැළපිය හැක (චැසි අංකය අනුව)', unknown: 'ගැළපීම තහවුරු නැත — චැසි / කොටස් අංකය දෙන්න' };

/** Does the part fit this vehicle? */
export const FitmentBadge: React.FC<{ level: Fitment }> = ({ level }) => (
  <View style={[styles.pill, level === 'confirmed' && styles.pillOk, level === 'unknown' && styles.pillWarn]}>
    <Text style={[styles.pillText, level === 'confirmed' && { color: Colors.successText }, level === 'unknown' && { color: Colors.warning }]}>{FITMENT_TEXT[level]}</Text>
  </View>
);

/** A quoted price against the market reference. */
export const PriceTagChip: React.FC<{ tag: PriceTag }> = ({ tag }) => (
  <View style={[styles.pill, tag === 'low' && styles.pillOk, tag === 'high' && styles.pillWarn]}>
    <Text style={[styles.pillText, tag === 'low' && { color: Colors.successText }, tag === 'high' && { color: Colors.warning }]}>{PRICE_TAG_LABEL[tag]}</Text>
  </View>
);

/** "TOPCODE recommended this shop" (garage referral); the owner can read the disclosure. */
export const ReferralBadge: React.FC<{ garageName: string; onPress?: () => void }> = ({ garageName, onPress }) => (
  <Pressable style={styles.pillBlue} onPress={onPress} disabled={!onPress} accessibilityLabel={`Recommended by ${garageName}`}>
    <Text style={styles.pillBlueText}>🤝 {garageName} නිර්දේශ කළා{onPress ? ' · විස්තර' : ''}</Text>
  </Pressable>
);

const SORTS: MartSort[] = ['distance', 'rating', 'price', 'response', 'service'];

/** The sort chips of a shop list: nearest, best rated, lowest price, fastest reply, best service. */
export const SortChips: React.FC<{ value: MartSort; onChange: (s: MartSort) => void; options?: MartSort[] }> = ({ value, onChange, options = SORTS }) => (
  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
    {options.map((s) => {
      const on = s === value;
      return (
        <Pressable key={s} style={[styles.chip, on && styles.chipOn]} onPress={() => onChange(s)} accessibilityLabel={`Sort ${s}`}>
          <Text style={[styles.chipText, on && styles.chipTextOn]}>{SORT_LABELS[s]}</Text>
        </Pressable>
      );
    })}
  </ScrollView>
);

const styles = themedStyles(() =>
  StyleSheet.create({
    pill: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, backgroundColor: softFill() },
    pillOk: { backgroundColor: 'rgba(16, 185, 129, 0.12)' },
    pillWarn: { backgroundColor: 'rgba(245, 158, 11, 0.12)' },
    pillText: { fontSize: 10.5, fontFamily: FONTS.bodySemiBold, color: Colors.textMuted },
    pillBlue: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, backgroundColor: 'rgba(2, 132, 199, 0.12)' },
    pillBlueText: { fontSize: 10.5, fontFamily: FONTS.bodySemiBold, color: Colors.primary },
    chips: { gap: 8, paddingHorizontal: 16 },
    chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 18, backgroundColor: softFill(), borderWidth: 1, borderColor: softEdge() },
    chipOn: { backgroundColor: Colors.primary, borderColor: Colors.primary },
    chipText: { fontSize: 12, fontFamily: FONTS.bodySemiBold, color: Colors.textMuted },
    chipTextOn: { color: '#ffffff' },
  })
);
