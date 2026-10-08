import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Colors, themedStyles } from '../theme/colors';
import { FONTS } from '../theme/fonts';
import type { PartType, ShopListing } from '../types';
import { shopBadges, shopServiceScore } from '../marketplace/partsMart';
import { money } from '../utils/format';
import { softEdge, softFill, softShadow } from './Glass';

/** What a shop shows for the part being searched. 'ask' = it doesn't publish live stock, so the buyer asks. */
export type ShopAvailability = { state: 'inStock' | 'low' | 'out' | 'ask'; price?: number; qty?: number; partType?: PartType; brand?: string };

/** A parts shop in OnMart lists: who it is, how it performs, and (when searching) whether it has the part. */
export const ShopCard: React.FC<{
  shop: ShopListing;
  availability?: ShopAvailability;
  onPress?: () => void;
  onCall?: () => void;
  /** Extra line under the card (e.g. a "recommended by" badge). */
  footer?: React.ReactNode;
  selected?: boolean;
}> = ({ shop, availability, onPress, onCall, footer, selected }) => {
  const badges = shopBadges(shop);
  const a = availability;
  return (
    <Pressable style={({ pressed }) => [styles.card, selected && styles.cardSelected, pressed && !!onPress && styles.pressed]} onPress={onPress} disabled={!onPress} accessibilityLabel={`Shop ${shop.name}`}>
      <View style={styles.top}>
        <View style={styles.thumb}>
          <Text style={styles.thumbText}>{shop.name.replace(/[^A-Za-z]/g, '').slice(0, 3).toUpperCase()}</Text>
        </View>
        <View style={styles.flex1}>
          <Text style={styles.name} numberOfLines={1}>
            {shop.name}
          </Text>
          <View style={styles.meta}>
            <Text style={styles.rating}>
              ★ {shop.rating.toFixed(1)} <Text style={styles.muted}>({shop.ratingCount})</Text>
            </Text>
            <Text style={[styles.open, !shop.isOpen && styles.closed]}>{shop.isOpen ? '● විවෘතයි' : '● වසා ඇත'}</Text>
            <Text style={styles.muted}>📍 {shop.distanceKm < 10 ? shop.distanceKm.toFixed(1) : Math.round(shop.distanceKm)} කි.මී.</Text>
          </View>
          <Text style={styles.sub} numberOfLines={1}>
            {shop.district} · ⏱ මිනි. {shop.stats.avgResponseMin} · සේවාව {shopServiceScore(shop.stats).toFixed(1)}
          </Text>
        </View>
        {!!onCall && (
          <Pressable style={styles.callBtn} onPress={onCall} accessibilityLabel={`Call ${shop.name}`} hitSlop={6}>
            <Text style={styles.callIcon}>📞</Text>
          </Pressable>
        )}
      </View>

      {badges.length > 0 && (
        <View style={styles.badges}>
          {badges.map((b) => (
            <View key={b} style={styles.badge}>
              <Text style={styles.badgeText}>{b}</Text>
            </View>
          ))}
        </View>
      )}

      {!!a && (
        <View style={[styles.avail, a.state === 'inStock' && styles.availOk, a.state === 'low' && styles.availLow]}>
          <Text style={[styles.availText, a.state === 'inStock' && { color: Colors.successText }, a.state === 'low' && { color: Colors.warning }]}>
            {a.state === 'inStock' && `✓ තොගයේ ඇත${a.price ? ` · ${money(a.price)}` : ''}${a.partType && a.partType !== 'GarageChoice' ? ` · ${a.partType}` : ''}`}
            {a.state === 'low' && `⚠ අවසන් ඒකක ${a.qty ?? ''} ක් පමණි${a.price ? ` · ${money(a.price)}` : ''}`}
            {a.state === 'out' && 'තොගයේ නැත'}
            {a.state === 'ask' && 'සජීවී තොගයක් නැත — තහවුරු කිරීමට වෙළඳසැලෙන් අසන්න'}
          </Text>
        </View>
      )}
      {footer}
    </Pressable>
  );
};

const styles = themedStyles(() =>
  StyleSheet.create({
    flex1: { flex: 1 },
    card: { backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: softEdge(), borderRadius: 20, padding: 14, gap: 10, ...softShadow() },
    cardSelected: { borderColor: Colors.primary },
    pressed: { opacity: 0.85 },
    top: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    thumb: { width: 46, height: 46, borderRadius: 16, backgroundColor: softFill(), alignItems: 'center', justifyContent: 'center' },
    thumbText: { fontSize: 12, fontWeight: '900', color: Colors.primary, letterSpacing: 0.4 },
    name: { fontSize: 14, fontFamily: FONTS.titleBold, color: Colors.textMain },
    meta: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 2, flexWrap: 'wrap' },
    rating: { fontSize: 11.5, fontFamily: FONTS.bodyBold, color: Colors.warning },
    open: { fontSize: 10.5, fontFamily: FONTS.bodySemiBold, color: Colors.successText },
    closed: { color: Colors.textMuted },
    muted: { fontSize: 10.5, fontFamily: FONTS.bodyRegular, color: Colors.textMuted },
    sub: { fontSize: 10.5, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, marginTop: 2 },
    callBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: softFill(), alignItems: 'center', justifyContent: 'center' },
    callIcon: { fontSize: 15 },
    badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    badge: { paddingHorizontal: 9, paddingVertical: 3, borderRadius: 10, backgroundColor: softFill() },
    badgeText: { fontSize: 10, fontFamily: FONTS.bodySemiBold, color: Colors.primary },
    avail: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, backgroundColor: softFill() },
    availOk: { backgroundColor: 'rgba(16, 185, 129, 0.12)' },
    availLow: { backgroundColor: 'rgba(245, 158, 11, 0.12)' },
    availText: { fontSize: 11.5, fontFamily: FONTS.bodySemiBold, color: Colors.textMuted },
  })
);
