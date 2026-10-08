import React, { useMemo, useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import {
  availabilityAt,
  canonicalPartName,
  Colors,
  EmptyState,
  FONTS,
  getThemeMode,
  PinnedEdge,
  rankShops,
  SEARCH_RINGS,
  ShopCard,
  shopPriceFor,
  shopsInRing,
  shopsNear,
  SortChips,
  tradeDiscount,
  themedStyles,
  usePinnedEdge,
  softEdge,
  softFill,
  softShadow,
  type MartSort,
  type SearchRing,
  type ShopAvailability,
  type ShopListing,
} from '@ongarage/shared';
import { useGarage } from '../context/GarageContext';

/** OnMart for the garage: the shops around it, sorted and searched for a part. (Orders for booked jobs are in "Job parts".) */
export const GarageMartView: React.FC = () => {
  const { profile } = useGarage();
  const { progress: edge, scrollProps } = usePinnedEdge();
  const [sort, setSort] = useState<MartSort>('distance');
  const [ring, setRing] = useState<SearchRing>('nearby');
  const [query, setQuery] = useState('');

  const all = useMemo(() => shopsNear(profile.coords), [profile.coords]);
  const q = query.trim();
  const partName = q ? canonicalPartName(q) : null;
  const shops = useMemo(() => rankShops(shopsInRing(all, ring), sort, { priceOf: partName ? (s) => shopPriceFor(s.id, partName) : undefined, liveStockFirst: !!q }), [all, ring, sort, partName, q]);

  const availability = (s: ShopListing): ShopAvailability | undefined => {
    if (!q) return undefined;
    if (!partName || !s.liveStock) return { state: 'ask' };
    const a = availabilityAt(s.id, partName);
    return a ? { state: a.lowStock ? 'low' : 'inStock', price: a.price, qty: a.qty, partType: a.partType, brand: a.brand } : { state: 'out' };
  };

  return (
    <View style={styles.flex1}>
      <View style={styles.pinned}>
        <PinnedEdge progress={edge} />
        <View style={styles.searchRow}>
          <TextInput style={styles.search} value={query} onChangeText={setQuery} placeholder="🔍 කොටසක් සොයන්න (brake pad, alternator…)" placeholderTextColor={Colors.textMuted} accessibilityLabel="Search parts" />
        </View>
        <SortChips value={sort} onChange={setSort} />
      </View>
      <ScrollView style={styles.flex1} {...scrollProps} contentContainerStyle={styles.body} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={styles.chips}>
          {SEARCH_RINGS.map((r) => (
            <Pressable key={r.ring} style={[styles.chip, ring === r.ring && styles.chipOn]} onPress={() => setRing(r.ring)}>
              <Text style={[styles.chipText, ring === r.ring && styles.chipTextOn]}>{r.label}</Text>
            </Pressable>
          ))}
        </View>
        <Text style={styles.hint}>ඔබට කොටසක් ගෙන්වා ගත නොහැකි නම්, පරීක්ෂා වාර්තාවේ “පාරිභෝගිකයා මිලදී ගනී” තෝරා මෙම වෙළඳසැල් ගනුදෙනුකරුට නිර්දේශ කරන්න — එවිට ඔවුන්ගේ ආදායමෙන් ඔබට කොමිස් ලැබිය හැක.</Text>
        {shops.length === 0 ? (
          <EmptyState icon="🔩" title="ළඟ වෙළඳසැල් නැත" text="පරාසය විශාල කර බලන්න." />
        ) : (
          shops.map((s) => (
            <ShopCard
              key={s.id}
              shop={s}
              availability={availability(s)}
              onCall={() => Linking.openURL(`tel:${s.phone.replace(/\s/g, '')}`)}
              footer={
                <>
                  {tradeDiscount(profile.id, s.id) > 0 && <Text style={styles.commission}>🏷️ ඔබට ගිවිසුම් මිල −{tradeDiscount(profile.id, s.id)}% (ඔබගේ මිල ගණන් ඉල්ලීම්වලට ස්වයංක්‍රීයව)</Text>}
                  {!!s.referralPercent && <Text style={styles.commission}>🤝 ඔබ නිර්දේශ කළ ගනුදෙනුකරුවන්ගෙන් කොමිස් {s.referralPercent}%</Text>}
                </>
              }
            />
          ))
        )}
      </ScrollView>
    </View>
  );
};

const styles = themedStyles(() =>
  StyleSheet.create({
    flex1: { flex: 1 },
    pinned: { zIndex: 5, paddingTop: 8, paddingBottom: 10, gap: 10, backgroundColor: getThemeMode() === 'dark' ? Colors.bgBody : '#ffffff' },
    searchRow: { paddingHorizontal: 16 },
    search: { height: 46, paddingHorizontal: 16, borderRadius: 23, backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: softEdge(), color: Colors.textMain, fontSize: 13, fontFamily: FONTS.bodyRegular, ...softShadow() },
    body: { padding: 16, paddingTop: 8, gap: 12, paddingBottom: 110 },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 16, backgroundColor: softFill(), borderWidth: 1, borderColor: softEdge() },
    chipOn: { backgroundColor: Colors.primary, borderColor: Colors.primary },
    chipText: { fontSize: 11.5, fontFamily: FONTS.bodySemiBold, color: Colors.textMuted },
    chipTextOn: { color: '#ffffff' },
    hint: { fontSize: 10.5, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, lineHeight: 16 },
    commission: { fontSize: 10.5, fontFamily: FONTS.bodySemiBold, color: Colors.primary },
  })
);
