import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Colors, themedStyles } from '../../theme/colors';
import { FONTS } from '../../theme/fonts';
import { availabilityAt, MART_SHOPS, shopsNear } from '../../constants/martShops';
import { shopsInRing } from '../../marketplace/partsMart';
import { money } from '../../utils/format';
import { softEdge, softFill } from '../Glass';
import type { LatLng, PartType } from '../../types';

/**
 * A part the garage can't fetch itself: the owner buys it, and the garage points them to shops it believes have it.
 * Shows the nearest shops that sell this kind of part (live-stock shops say whether they have it); up to three can be recommended.
 */
export const ShopRecommender: React.FC<{
  name: string;
  partType: PartType;
  /** Where the garage is (distances are measured from here). */
  coords?: LatLng;
  value: string[];
  onChange: (ids: string[]) => void;
  max?: number;
  /** Garages see the referral fee each shop pays; technicians do not. */
  showCommission?: boolean;
}> = ({ name, partType, coords, value, onChange, max = 3, showCommission }) => {
  const shops = useMemo(
    () =>
      shopsInRing(shopsNear(coords ?? MART_SHOPS[0].coords), 'wider')
        .filter((s) => partType === 'GarageChoice' || s.types.includes(partType))
        .slice(0, 6),
    [coords, partType]
  );
  const toggle = (id: string) => onChange(value.includes(id) ? value.filter((x) => x !== id) : value.length >= max ? value : [...value, id]);

  if (shops.length === 0) return <Text style={styles.hint}>ළඟ මෙම වර්ගයේ කොටස් අලෙවි කරන වෙළඳසැල් නැත — ගනුදෙනුකරුට OnMart හි සොයා ගත හැක.</Text>;

  return (
    <View style={styles.wrap}>
      {shops.map((s) => {
        const on = value.includes(s.id);
        const a = s.liveStock ? availabilityAt(s.id, name, partType) : undefined;
        return (
          <Pressable key={s.id} style={[styles.row, on && styles.rowOn]} onPress={() => toggle(s.id)} accessibilityRole="checkbox" accessibilityState={{ checked: on }} accessibilityLabel={`Recommend ${s.name}`}>
            <View style={[styles.check, on && styles.checkOn]}>{on && <Text style={styles.mark}>✓</Text>}</View>
            <View style={styles.flex1}>
              <Text style={styles.name} numberOfLines={1}>
                {s.name}
              </Text>
              <Text style={styles.sub} numberOfLines={1}>
                ★ {s.rating.toFixed(1)} · {s.distanceKm < 10 ? s.distanceKm.toFixed(1) : Math.round(s.distanceKm)} කි.මී.
                {showCommission && s.referralPercent ? ` · කොමිස් ${s.referralPercent}%` : ''}
              </Text>
            </View>
            <Text style={[styles.avail, a ? { color: Colors.successText } : null]} numberOfLines={1}>
              {s.liveStock ? (a ? `✓ ${money(a.price)}` : 'තොගයේ නැත') : 'තහවුරු නැත'}
            </Text>
          </Pressable>
        );
      })}
      <Text style={styles.hint}>තෝරාගත් ({value.length}/{max}) වෙළඳසැල් ගනුදෙනුකරුගේ OnMart හි “ගරාජය නිර්දේශ කළා” ලෙස පෙනේ. ඔවුන් ඒවායෙන් මිලදී ගත් විට සහ රැකියාව අවසන් වූ විට වෙළඳසැලෙන් ඔබට කොමිස් ලැබිය හැක — ගනුදෙනුකරුට එය පෙනේ, මිල වෙනස් නොවේ.</Text>
    </View>
  );
};

const styles = themedStyles(() =>
  StyleSheet.create({
    flex1: { flex: 1, minWidth: 0 },
    wrap: { gap: 6 },
    row: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, borderRadius: 14, backgroundColor: softFill(), borderWidth: 1, borderColor: softEdge() },
    rowOn: { borderColor: Colors.primary },
    check: { width: 22, height: 22, borderRadius: 7, borderWidth: 2, borderColor: Colors.subtleBorder, alignItems: 'center', justifyContent: 'center' },
    checkOn: { backgroundColor: Colors.primary, borderColor: Colors.primary },
    mark: { fontSize: 13, fontWeight: '900', color: '#ffffff' },
    name: { fontSize: 12.5, fontFamily: FONTS.bodyBold, color: Colors.textMain },
    sub: { fontSize: 10, fontFamily: FONTS.bodyRegular, color: Colors.textMuted },
    avail: { fontSize: 10.5, fontFamily: FONTS.bodySemiBold, color: Colors.textMuted, maxWidth: 90, textAlign: 'right' },
    hint: { fontSize: 10.5, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, lineHeight: 16 },
  })
);
