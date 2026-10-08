import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Colors, FONTS, Gradient, money, themedStyles, softEdge, softShadow, type ShopListing } from '@ongarage/shared';

// Cover colours for shops (a photo per shop replaces these later); chosen from the shop's id so a shop keeps its colour.
const COVERS: { offset: string; color: string }[][] = [
  [{ offset: '0', color: '#162b63' }, { offset: '1', color: '#2a4690' }],
  [{ offset: '0', color: '#0ea5e9' }, { offset: '1', color: '#22d3ee' }],
  [{ offset: '0', color: '#f97316' }, { offset: '1', color: '#f59e0b' }],
  [{ offset: '0', color: '#10b981' }, { offset: '1', color: '#84cc16' }],
  [{ offset: '0', color: '#8b5cf6' }, { offset: '1', color: '#d946ef' }],
  [{ offset: '0', color: '#ef4444' }, { offset: '1', color: '#f43f5e' }],
];
const coverFor = (id: string) => COVERS[(Number(id.replace(/\D/g, '')) || 0) % COVERS.length];

/** A shop as a card with a coloured cover: its name, rating, distance, how fast it replies, and what it offers. */
export const ShopTile: React.FC<{ shop: ShopListing; ad?: boolean; tagline?: string; freeDeliveryOver?: number; onPress: () => void }> = ({ shop, ad, tagline, freeDeliveryOver, onPress }) => (
  <Pressable style={({ pressed }) => [styles.tile, pressed && styles.pressed]} onPress={onPress} accessibilityLabel={`Shop tile ${shop.name}`}>
    <View style={styles.cover}>
      <Gradient stops={coverFor(shop.id)} />
      <Text style={styles.watermark}>🏪</Text>
      <Text style={styles.initials}>{shop.name.replace(/[^A-Za-z]/g, '').slice(0, 3).toUpperCase()}</Text>
      {ad && (
        <View style={styles.adPill}>
          <Text style={styles.adText}>දැන්වීම</Text>
        </View>
      )}
      <View style={[styles.state, !shop.isOpen && styles.stateClosed]}>
        <Text style={styles.stateText}>{shop.isOpen ? '● විවෘතයි' : '● වසා ඇත'}</Text>
      </View>
    </View>
    <View style={styles.body}>
      <Text style={styles.name} numberOfLines={1}>
        {shop.name}
      </Text>
      <Text style={styles.meta} numberOfLines={1}>
        ★ {shop.rating.toFixed(1)} ({shop.ratingCount}) · {shop.distanceKm < 10 ? shop.distanceKm.toFixed(1) : Math.round(shop.distanceKm)} කි.මී. · ⏱ {shop.stats.avgResponseMin}මි.
      </Text>
      <View style={styles.chips}>
        {shop.liveStock && (
          <View style={styles.chip}>
            <Text style={styles.chipText}>සජීවී තොගය</Text>
          </View>
        )}
        {freeDeliveryOver !== undefined && (
          <View style={[styles.chip, styles.chipOffer]}>
            <Text style={[styles.chipText, { color: Colors.warning }]} numberOfLines={1}>
              🚚 {money(freeDeliveryOver)}+ නොමිලේ
            </Text>
          </View>
        )}
        {!shop.liveStock && freeDeliveryOver === undefined && !!tagline && (
          <View style={styles.chip}>
            <Text style={styles.chipText} numberOfLines={1}>
              {tagline}
            </Text>
          </View>
        )}
      </View>
    </View>
  </Pressable>
);

/** A titled row of shop cards that scrolls sideways; `ad` marks a paid row. */
export const ShopRow: React.FC<{
  title: string;
  shops: ShopListing[];
  info: Record<string, { tagline?: string; freeDeliveryOver?: number }>;
  ad?: boolean;
  onOpen: (shop: ShopListing) => void;
  onSeeAll?: () => void;
}> = ({ title, shops, info, ad, onOpen, onSeeAll }) => {
  if (shops.length === 0) return null;
  return (
    <View style={styles.row}>
      <View style={styles.head}>
        <Text style={styles.title}>{title}</Text>
        {ad && (
          <View style={styles.rowAd}>
            <Text style={styles.rowAdText}>දැන්වීම</Text>
          </View>
        )}
        {!!onSeeAll && (
          <Pressable style={styles.seeAll} onPress={onSeeAll} accessibilityLabel={`See all ${title}`}>
            <Text style={styles.seeAllText}>සියල්ල ›</Text>
          </Pressable>
        )}
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {shops.map((s) => (
          <ShopTile key={s.id} shop={s} ad={ad} tagline={info[s.id]?.tagline} freeDeliveryOver={info[s.id]?.freeDeliveryOver} onPress={() => onOpen(s)} />
        ))}
      </ScrollView>
    </View>
  );
};

// White text sits on the fixed-colour covers (the intended exception to theme colours).
const styles = themedStyles(() =>
  StyleSheet.create({
    row: { gap: 8 },
    head: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    title: { flex: 1, fontSize: 15, fontFamily: FONTS.titleBold, color: Colors.textMain },
    rowAd: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6, backgroundColor: 'rgba(245, 158, 11, 0.18)' },
    rowAdText: { fontSize: 9.5, fontWeight: '800', color: Colors.warning },
    seeAll: { paddingVertical: 2, paddingHorizontal: 4 },
    seeAllText: { fontSize: 11.5, fontFamily: FONTS.bodySemiBold, color: Colors.primary },
    scroll: { gap: 10, paddingRight: 8, paddingBottom: 4 },
    tile: { width: 196, borderRadius: 18, overflow: 'hidden', backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: softEdge(), ...softShadow() },
    pressed: { opacity: 0.88, transform: [{ scale: 0.99 }] },
    cover: { height: 92, justifyContent: 'flex-end', padding: 10 },
    watermark: { position: 'absolute', right: -6, top: -4, fontSize: 70, opacity: 0.22 },
    initials: { fontSize: 24, fontWeight: '900', color: '#fff', letterSpacing: 1 },
    adPill: { position: 'absolute', top: 8, left: 8, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, backgroundColor: 'rgba(255, 255, 255, 0.88)' },
    adText: { fontSize: 9, fontWeight: '800', color: '#0f172a' },
    state: { position: 'absolute', top: 8, right: 8, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8, backgroundColor: 'rgba(16, 185, 129, 0.9)' },
    stateClosed: { backgroundColor: 'rgba(15, 23, 42, 0.6)' },
    stateText: { fontSize: 9, fontFamily: FONTS.bodyBold, color: '#fff' },
    body: { padding: 10, gap: 4 },
    name: { fontSize: 12.5, fontFamily: FONTS.titleBold, color: Colors.textMain },
    meta: { fontSize: 10, fontFamily: FONTS.bodyRegular, color: Colors.textMuted },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, minHeight: 20 },
    chip: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 8, backgroundColor: 'rgba(2, 132, 199, 0.1)' },
    chipOffer: { backgroundColor: 'rgba(245, 158, 11, 0.14)' },
    chipText: { fontSize: 9.5, fontFamily: FONTS.bodySemiBold, color: Colors.primary },
  })
);
